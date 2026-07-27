import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const newImages = [
  "https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1086940/header.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg"
];

async function main() {
  const articles = await prisma.article.findMany({
    where: {
      featuredImageUrl: {
        contains: "unsplash.com"
      }
    }
  });

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const newImage = newImages[i % newImages.length];
    
    await prisma.article.update({
      where: { id: article.id },
      data: { featuredImageUrl: newImage }
    });
    console.log(`Updated article ${article.title} with image ${newImage}`);
  }
}

main()
  .catch((e) => {
    console.error("Update failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
