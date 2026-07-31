import { PrismaClient, ContentType, ArticleStatus, Difficulty } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // Replace with an existing author ID from your database
  const author = await prisma.user.findFirst({
    where: {
      role: "ADMIN",
    },
  });

  if (!author) {
    throw new Error("No admin user found.");
  }

  // Create tags
  const tagNames = [
    "ETS2",
    "Euro Truck Simulator 2",
    "ETS2 Mods",
    "Map Combo",
    "ProMods",
    "RusMap",
    "RoExtended",
    "Simulation",
    "Truck Simulator",
    "ETS2 Guide",
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

  // Create article
  const article = await prisma.article.create({
    data: {
      title:
        "ETS 2 Global Map Combo – Complete Installation Guide, Load Order & Setup (v1.58)",

      slug: "ets2-global-map-combo-guide-v158",

      excerpt:
        "Complete guide for installing and configuring the ETS 2 Global Map Combo for Euro Truck Simulator 2. Includes required DLCs, recommended load order, compatibility fixes, installation steps, troubleshooting tips, and performance recommendations for stable gameplay.",

      featuredImageUrl:
        "https://yourcdn.com/images/ets2-global-map-combo-cover.jpg",

      status: ArticleStatus.PUBLISHED,

      contentType: ContentType.GUIDE,
      guideType: "Mod Guide",

      authorId: author.id,

      seoTitle:
        "ETS 2 Global Map Combo Guide – Full Setup & Load Order",

      seoDescription:
        "Learn how to install the ETS 2 Global Map Combo in Euro Truck Simulator 2 with this complete setup guide. Includes load order, required mods, compatibility fixes, performance tips, and troubleshooting.",

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
                text: "ETS 2 Global Map Combo – Complete Installation Guide",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "If you want to transform Euro Truck Simulator 2 into a massive worldwide trucking experience, the ETS 2 Global Map Combo is one of the best ways to do it.",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "This combo merges multiple popular map expansions into one giant connected world, allowing you to drive across Europe, the Middle East, Africa, Asia, and additional regions in a single profile.",
              },
            ],
          },

          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              {
                type: "text",
                text: "Recommended Game Version",
              },
            ],
          },

          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Euro Truck Simulator 2 v1.58",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Fresh profile strongly recommended",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Disable incompatible old mods before starting",
                      },
                    ],
                  },
                ],
              },
            ],
          },

          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              {
                type: "text",
                text: "Required DLCs",
              },
            ],
          },

          {
            type: "bulletList",
            content: [
              "Going East!",
              "Scandinavia",
              "Vive La France!",
              "Italia",
              "Beyond the Baltic Sea",
              "Road to the Black Sea",
              "Iberia",
              "West Balkans",
              "Greece",
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
                text: "Main Maps Included",
              },
            ],
          },

          {
            type: "bulletList",
            content: [
              "ProMods Europe",
              "ProMods Middle East",
              "ProMods The Great Steppe",
              "RusMap",
              "RoExtended",
              "Poland Rebuilding",
              "Southern Region",
              "SibirMap",
              "Road to Asia",
              "Project Caucasus",
              "Red Sea Map",
              "Maghreb Map",
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
                text: "Installation Guide",
              },
            ],
          },

          {
            type: "orderedList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Download all required maps and compatibility connectors.",
                      },
                    ],
                  },
                ],
              },

              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Extract all downloaded archives using 7-Zip or WinRAR.",
                      },
                    ],
                  },
                ],
              },

              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Move all .scs files into Documents/Euro Truck Simulator 2/mod",
                      },
                    ],
                  },
                ],
              },

              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Enable the mods in Mod Manager using the correct load order.",
                      },
                    ],
                  },
                ],
              },

              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Create a fresh profile before starting the game.",
                      },
                    ],
                  },
                ],
              },
            ],
          },

          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              {
                type: "text",
                text: "Recommended Load Order",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Top Priority",
                marks: [{ type: "bold" }],
              },
            ],
          },

          {
            type: "bulletList",
            content: [
              "Background Map",
              "Map UI Fixes",
              "Zoom Crash Fix",
              "Promods Def",
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
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Main Maps",
                marks: [{ type: "bold" }],
              },
            ],
          },

          {
            type: "bulletList",
            content: [
              "RoExtended",
              "RusMap",
              "Southern Region",
              "Poland Rebuilding",
              "SibirMap",
              "Road to Asia",
              "Red Sea Map",
              "Maghreb",
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
                text: "Performance Tips",
              },
            ],
          },

          {
            type: "bulletList",
            content: [
              "Use SSD storage",
              "Avoid incompatible traffic mods",
              "Keep graphics settings balanced",
              "Use only tested map combinations",
              "Update connectors regularly",
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
                text: "Common Problems & Fixes",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Crash on Loading",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: " — Usually caused by incorrect load order or missing connectors.",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Invisible Roads",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: " — Move road connection patches higher in priority.",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Long Loading Times",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: " — Large map combos may take several minutes to load.",
              },
            ],
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
                text: "The ETS 2 Global Map Combo completely transforms Euro Truck Simulator 2 into a massive worldwide trucking simulator with thousands of kilometers of roads and countless new destinations.",
              },
            ],
          },

          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "If installed correctly with the proper load order and compatibility patches, it provides one of the most immersive ETS2 experiences available.",
              },
            ],
          },
        ],
      },

      tags: {
        create: tags.map((tag) => ({
          tagId: tag.id,
        })),
      },

      modGuide: {
        create: {
          gameName: "Euro Truck Simulator 2",

          modName: "ETS 2 Global Map Combo",

          gameVersionCompatibility: "ETS2 v1.58",

          difficulty: Difficulty.INTERMEDIATE,

          estimatedInstallMinutes: 45,

          prerequisiteList: [
            "All ETS2 map DLCs",
            "Fresh profile",
            "7-Zip or WinRAR",
            "Stable internet connection",
            "SSD storage recommended",
          ],

          bodyTitle: "About This Guide",

          installationTitle: "Installation Steps",

          sections: [
            {
              title: "Recommended Specs",
              items: [
                "16GB RAM minimum",
                "SSD recommended",
                "Modern CPU and GPU",
              ],
            },

            {
              title: "Installation Notes",
              items: [
                "Do not mix outdated maps",
                "Always verify compatibility",
                "Use tested connectors only",
              ],
            },

            {
              title: "Troubleshooting",
              items: [
                "Recheck load order",
                "Remove conflicting mods",
                "Verify all required DLCs",
              ],
            },
          ],
        },
      },
    },
  });

  console.log("Created article:", article.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/*
Schema reference used:
:contentReference[oaicite:0]{index=0}
*/