import { PrismaClient, ContentType, ArticleStatus } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // Find an existing admin user to use as author
  const author = await prisma.user.findFirst({
    where: {
      role: "ADMIN",
    },
  });

  if (!author) {
    throw new Error("No admin user found. Please ensure an admin user exists.");
  }

  // Create tags relevant to game deals
  const tagNames = [
    "Gaming Deals",
    "PC Games",
    "Steam Sale",
    "Game Discount",
    "Best Deals",
    "Action RPG",
    "Open World",
  ];

  const tags = await Promise.all(
    tagNames.map(async (name) => {
      return prisma.tag.upsert({
        where: {
          slug: name.toLowerCase().replace(/\s+/g, "-"),
        },
        update: {},
        create: {
          name,
          slug: name.toLowerCase().replace(/\s+/g, "-"),
        },
      });
    })
  );

  // Create the deal article
  const article = await prisma.article.create({
    data: {
      title: "Steam Summer Sale 2025 – Best Gaming Deals You Shouldn't Miss",

      slug: "steam-summer-sale-2025-best-gaming-deals",

      excerpt:
        "The Steam Summer Sale 2025 is live! Grab massive discounts on top titles including Elden Ring, Cyberpunk 2077, Red Dead Redemption 2, and more. Here are the best deals available right now before they expire.",

      featuredImageUrl:
        "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg",

      status: ArticleStatus.PUBLISHED,

      contentType: ContentType.DEAL,

      authorId: author.id,

      seoTitle: "Steam Summer Sale 2025 – Best PC Game Deals & Discounts",

      seoDescription:
        "Discover the best deals from Steam Summer Sale 2025. Top discounts on Elden Ring, Cyberpunk 2077, Red Dead Redemption 2, Baldur's Gate 3, and many more. Don't miss out!",

      publishedAt: new Date(),

      featured: true,

      isBreaking: false,

      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [
              {
                type: "text",
                text: "Steam Summer Sale 2025 – Best Gaming Deals You Shouldn't Miss",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "The Steam Summer Sale 2025 is officially live, and it's bringing some of the best discounts we've seen all year on top PC games. Whether you're looking for action RPGs, open-world adventures, or indie gems, there's something for everyone.",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "The sale runs from June 26 to July 10, 2025, so you have plenty of time to grab these deals — but don't wait too long, as daily flash deals may expire sooner.",
              },
            ],
          },

          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              {
                type: "text",
                text: "Top Deals of the Sale",
              },
            ],
          },

          // Elden Ring
          {
            type: "heading",
            attrs: { level: 3 },
            content: [
              {
                type: "text",
                text: "Elden Ring – 50% Off",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Original Price: ",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: "Rs.2,999  |  ",
              },
              {
                type: "text",
                text: "Sale Price: ",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: "Rs.1,499",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "FromSoftware's masterpiece and one of the greatest open-world action RPGs ever made. If you haven't played Elden Ring yet, now is the perfect time to dive into the Lands Between. The Shadow of the Erdtree expansion is also discounted.",
              },
            ],
          },

          // Cyberpunk 2077
          {
            type: "heading",
            attrs: { level: 3 },
            content: [
              {
                type: "text",
                text: "Cyberpunk 2077 + Phantom Liberty – 60% Off",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Original Price: ",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: "Rs.3,499  |  ",
              },
              {
                type: "text",
                text: "Sale Price: ",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: "Rs.1,399",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "CD Projekt RED's ambitious open-world RPG has come a long way since launch and is now considered one of the best RPG experiences on PC. The Phantom Liberty expansion adds hours of gripping spy-thriller content.",
              },
            ],
          },

          // Red Dead Redemption 2
          {
            type: "heading",
            attrs: { level: 3 },
            content: [
              {
                type: "text",
                text: "Red Dead Redemption 2 – 67% Off",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Original Price: ",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: "Rs.2,799  |  ",
              },
              {
                type: "text",
                text: "Sale Price: ",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: "Rs.924",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Rockstar's epic tale of Arthur Morgan and the Van der Linde gang remains one of the most breathtaking open-world experiences in gaming. At 67% off, it's an absolute steal.",
              },
            ],
          },

          // Baldur's Gate 3
          {
            type: "heading",
            attrs: { level: 3 },
            content: [
              {
                type: "text",
                text: "Baldur's Gate 3 – 33% Off",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Original Price: ",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: "Rs.3,999  |  ",
              },
              {
                type: "text",
                text: "Sale Price: ",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: "Rs.2,679",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Larian Studios' critically acclaimed RPG took the gaming world by storm. Baldur's Gate 3 offers hundreds of hours of deeply reactive storytelling, tactical combat, and co-op support. A must-play.",
              },
            ],
          },

          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              {
                type: "text",
                text: "Hidden Gems Under Rs.500",
              },
            ],
          },

          {
            type: "bulletList",
            content: [
              "Hades – Rs.279 (Was Rs.929)",
              "Hollow Knight – Rs.189 (Was Rs.629)",
              "Disco Elysium – Rs.249 (Was Rs.1,249)",
              "Deep Rock Galactic – Rs.349 (Was Rs.899)",
              "Stardew Valley – Rs.159 (Was Rs.529)",
            ].map((item) => ({
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: item,
                    },
                  ],
                },
              ],
            })),
          },

          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              {
                type: "text",
                text: "Platform and Subscription Bundles",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "PC Game Pass",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: " – Get 3 months for the price of 1 during the sale period. Access hundreds of games including Day 1 releases.",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Humble Choice",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: " – July's bundle includes 10 games for Rs.1,299, with some titles also being featured in the Steam sale.",
              },
            ],
          },

          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              {
                type: "text",
                text: "When Does the Sale End?",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "The Steam Summer Sale 2025 ends on ",
              },
              {
                type: "text",
                text: "July 10, 2025 at 10:00 AM PDT",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: ". Make sure to add games to your wishlist and keep an eye on flash deals that rotate daily.",
              },
            ],
          },

          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              {
                type: "text",
                text: "Tips to Get the Best Deals",
              },
            ],
          },

          {
            type: "bulletList",
            content: [
              "Add games to your Steam wishlist — you'll get notified when they go on sale",
              "Use IsThereAnyDeal.com to track historical lowest prices",
              "Check daily flash deals early in the morning for the best discounts",
              "Bundle games with their DLCs for extra savings",
              "Look out for publisher bundles — they can save you even more",
            ].map((item) => ({
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: item,
                    },
                  ],
                },
              ],
            })),
          },

          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              {
                type: "text",
                text: "Final Thoughts",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "The Steam Summer Sale 2025 is one of the best sales we've seen in a while. With massive discounts on AAA titles and indie gems alike, there's no reason to miss out. Grab your wishlist games now before prices go back up on July 10.",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "We'll keep updating this list as new flash deals go live throughout the sale. Bookmark this page and check back daily!",
              },
            ],
          },
        ],
      },

      ArticleTag: {
        create: tags.map((tag) => ({
          tagId: tag.id,
        })),
      },
    },
  });

  console.log("Created deal post:", article.title);
  console.log("Slug:", article.slug);
  console.log("ContentType:", article.contentType);
  console.log("Status:", article.status);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
