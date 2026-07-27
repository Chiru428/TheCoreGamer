import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { headers } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = new URLSearchParams(url.search);

    // Verify it's a valid Steam response
    if (params.get('openid.mode') !== 'id_res') {
      return NextResponse.redirect(new URL('/settings/security?error=Invalid+Steam+Response', req.url));
    }

    // 1. Validate the OpenID signature with Steam
    const checkParams = new URLSearchParams();
    for (const [key, value] of params.entries()) {
      checkParams.set(key, value);
    }
    checkParams.set('openid.mode', 'check_authentication');

    const res = await fetch('https://steamcommunity.com/openid/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: checkParams.toString(),
    });

    const text = await res.text();
    if (!text.includes('is_valid:true')) {
      console.error('[Steam Callback] OpenID validation failed. Response:', text);
      return NextResponse.redirect(new URL('/settings/security?error=Steam+Validation+Failed', req.url));
    }

    // 2. Extract Steam ID
    const claimedId = params.get('openid.claimed_id') || '';
    const steamId = claimedId.match(/\/(\d+)$/)?.[1];
    if (!steamId) {
      console.error('[Steam Callback] Could not extract Steam ID from claimed_id:', claimedId);
      return NextResponse.redirect(new URL('/settings/security?error=Steam+ID+Missing', req.url));
    }

    // 3. Fetch Steam Profile Data
    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) {
      console.error('[Steam Callback] STEAM_API_KEY is not set');
      return NextResponse.redirect(new URL('/settings/security?error=Steam+API+Key+Missing', req.url));
    }

    const profileRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`
    );
    if (!profileRes.ok) {
      console.error('[Steam Callback] Steam Profile fetch failed:', profileRes.status);
      return NextResponse.redirect(new URL('/settings/security?error=Steam+Profile+Fetch+Failed', req.url));
    }
    const profileData = await profileRes.json();
    const profile = profileData.response?.players?.[0];
    if (!profile) {
      console.error('[Steam Callback] Steam profile not found for ID:', steamId);
      return NextResponse.redirect(new URL('/settings/security?error=Steam+Profile+Not+Found', req.url));
    }

    // 4. Retrieve current user session to link the account
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-fallback-secret-do-not-use-in-production-32chars!!';
    const reqHeaders = await headers();
    const existingToken = await getToken({
      req: { headers: reqHeaders } as any,
      secret,
      secureCookie: (process.env.NEXTAUTH_URL || '').startsWith('https://'),
    });

    const currentUserId = (existingToken?.id as string) || null;
    
    // Note: In typical NextAuth flow, if currentUserId is null, this would sign the user up or log them in.
    // In our manual route for linking accounts, we strictly require an existing user session.
    if (!currentUserId) {
       // Just in case they hit this without being logged in
       return NextResponse.redirect(new URL('/auth/login?error=Session+Required+For+Linking', req.url));
    }

    // 5. Sync with Backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const syncHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
      'user-agent': reqHeaders.get('user-agent') || '',
      'x-real-ip': reqHeaders.get('x-real-ip') || '',
      'x-forwarded-for': reqHeaders.get('x-forwarded-for') || '',
    };

    const syncRes = await fetch(`${backendUrl}/api/auth/oauth-sync`, {
      method: 'POST',
      headers: syncHeaders,
      body: JSON.stringify({
        email: null,
        name: profile.personaname,
        image: profile.avatarfull,
        provider: 'steam',
        providerAccountId: profile.steamid,
        currentUserId,
      }),
    });

    const syncJson = await syncRes.json();
    if (!syncRes.ok || !syncJson.success) {
      console.error('[Steam Callback] Backend sync failed:', syncJson.error);
      return NextResponse.redirect(new URL(`/settings/security?error=${encodeURIComponent(syncJson.error || 'Sync Failed')}`, req.url));
    }

    // 6. Redirect to security page indicating success!
    return NextResponse.redirect(new URL('/settings/security?success=Steam+Linked', req.url));

  } catch (error) {
    console.error('[Steam Callback] Internal error:', error);
    return NextResponse.redirect(new URL('/settings/security?error=Internal+Server+Error', req.url));
  }
}
