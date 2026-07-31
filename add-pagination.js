const fs = require('fs');
const path = require('path');

const pages = [
  { name: 'AdminNews', path: 'news/page.tsx', contentType: 'NEWS', base: '/admin/news' },
  { name: 'AdminReviews', path: 'reviews/page.tsx', contentType: 'REVIEW', base: '/admin/reviews' },
  { name: 'AdminGuides', path: 'guides/page.tsx', contentType: 'GUIDE', base: '/admin/guides' },
  { name: 'AdminOpinions', path: 'opinions/page.tsx', contentType: 'OPINION', base: '/admin/opinions' },
  { name: 'AdminDeals', path: 'deals/page.tsx', contentType: 'DEAL', base: '/admin/deals' },
  { name: 'AdminFeatures', path: 'features/page.tsx', contentType: 'FEATURE', base: '/admin/features' },
  { name: 'AdminListicles', path: 'listicles/page.tsx', contentType: 'LISTICLE', base: '/admin/listicles' },
];

for (const p of pages) {
  const fullPath = path.join(__dirname, 'frontend/app/admin', p.path);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Skip if already has Pagination
  if (content.includes('Pagination')) {
    console.log(`Skipping ${p.name}, already has pagination.`);
    continue;
  }

  // 1. Add imports
  content = content.replace(
    /import { useState } from 'react';(.*?)(\r?\n)/,
    `import { useState, Suspense } from 'react';$1$2import { useSearchParams } from 'next/navigation';\nimport Pagination from '@/components/ui/Pagination';\n`
  );

  // 2. Rename default export to List
  content = content.replace(`export default function ${p.name}Page() {`, `function ${p.name}List() {`);

  // 3. Add useSearchParams
  content = content.replace(
    /const \[deletingSlug, setDeletingSlug\] = useState<string \| null>\(null\);/,
    `const [deletingSlug, setDeletingSlug] = useState<string | null>(null);\n  const searchParams = useSearchParams();\n  const page = Number(searchParams.get('page')) || 1;`
  );

  // 4. Update SWR
  // Match `const { data, mutate, isLoading } = useSWR(['...', statusFilter, search, isAuthorRole], ([_, status, q, mine]) => fetchAdminPosts({ contentType: '...', status: status || undefined, search: q || undefined, sort: 'updated', mine }));`
  content = content.replace(
    /useSWR\(\['(.*?)', statusFilter, search, isAuthorRole\], \(\[_, status, q, mine\]\) => fetchAdminPosts\(\{ contentType: '(.*?)', status: status \|\| undefined, search: q \|\| undefined, sort: 'updated', mine \}\)\)/,
    `useSWR(['$1', statusFilter, search, isAuthorRole, page], ([_, status, q, mine, p]) => fetchAdminPosts({ contentType: '$2', status: status || undefined, search: q || undefined, sort: 'updated', mine, page: Number(p), limit: 50 }))`
  );

  // 5. Add Pagination component
  content = content.replace(
    /(\s*)<\/div>\s*<\/div>\s*\);\s*}/,
    `$1  <Pagination currentPage={page} totalPages={data?.pagination?.totalPages || 1} basePath="${p.base}" className="mt-6 mb-8" />\n$1</div>\n    </div>\n  );\n}`
  );

  // 6. Add the new default export
  content += `\n\nexport default function ${p.name}Page() {\n  return (\n    <Suspense fallback={<div className="flex justify-center p-8"><Spinner /></div>}>\n      <${p.name}List />\n    </Suspense>\n  );\n}\n`;

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${p.name}`);
}
