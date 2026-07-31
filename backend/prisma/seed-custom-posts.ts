import { PrismaClient, ContentType, ArticleStatus } from "../src/generated/prisma";

const prisma = new PrismaClient();

const generateContent = (title: string) => {
  const paragraphText = "Gaming has evolved significantly over the past few decades, transforming from simple pixelated adventures into vast, immersive worlds that rival blockbuster movies in both scope and storytelling. As we look at the current landscape of the industry, it's clear that developers are pushing the boundaries of what's possible with modern hardware. The integration of advanced physics, ray tracing, and incredibly detailed character models brings a level of realism that was once thought impossible. Furthermore, the narrative depth found in many contemporary titles tackles complex themes, offering players not just entertainment, but meaningful experiences that resonate long after the game is finished. Exploring these virtual environments allows us to appreciate the meticulous craftsmanship and artistic vision required to build such detailed universes. Multiplayer components have also seen a massive shift, moving from local co-op to massive online ecosystems where millions of players interact simultaneously. This interconnectedness has fostered vibrant communities and competitive eSports scenes that continue to grow in popularity. Despite the technological advancements, the core of gaming remains the same: the joy of play, the thrill of overcoming challenges, and the satisfaction of mastering complex systems. Whether you prefer fast-paced action, strategic planning, or narrative-driven exploration, the diverse array of genres ensures there is something for everyone. As we anticipate future innovations, such as virtual reality and cloud gaming, one thing is certain: the medium will continue to captivate and inspire audiences worldwide. ";

  // The paragraph above is ~235 words. Repeating it 3 times yields ~700 words.
  const fullText = paragraphText + paragraphText + paragraphText;

  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [
          {
            type: "text",
            text: title,
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: fullText,
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Additionally, " + paragraphText,
          },
        ],
      }
    ],
  };
};

const imageBanners = [
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
  "https://images.unsplash.com/photo-1552820728-8b83bb6b7738?w=800&q=80",
  "https://images.unsplash.com/photo-1605901309584-818e25960b8f?w=800&q=80",
  "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=800&q=80",
  "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80"
];

async function main() {
  const author = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!author) {
    throw new Error("No admin user found. Cannot seed posts.");
  }

  const categories = [
    { type: ContentType.OPINION, prefix: "Opinion" },
    { type: ContentType.LISTICLE, prefix: "Top 10" },

    { type: ContentType.DEAL, prefix: "Deal Alert" },
  ];

  for (const category of categories) {
    for (let i = 1; i <= 5; i++) {
      const title = `${category.prefix}: Amazing Gaming Experience Part ${i}`;
      const slug = `${category.prefix.toLowerCase().replace(/\s+/g, "-")}-amazing-gaming-experience-part-${i}-${Date.now()}`;
      
      const article = await prisma.article.create({
        data: {
          title,
          slug,
          excerpt: `This is an exclusive ${category.prefix.toLowerCase()} piece exploring the fascinating aspects of the modern gaming landscape. Read more to find out what makes this so special.`,
          featuredImageUrl: imageBanners[i - 1],
          status: ArticleStatus.PUBLISHED,
          contentType: category.type,
          authorId: author.id,
          seoTitle: title,
          seoDescription: `Check out our latest ${category.prefix.toLowerCase()} post about gaming experiences.`,
          publishedAt: new Date(),
          content: generateContent(title),
        },
      });

      console.log(`Created ${category.type} post: ${article.title}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
