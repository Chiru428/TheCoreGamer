import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.article.update({
    where: { slug: "steam-summer-sale-2025-best-gaming-deals" },
    data: {
      featuredImageUrl:
        "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg",
    },
  });
  console.log("Updated featuredImageUrl for:", updated.slug);
  console.log("New image:", updated.featuredImageUrl);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
