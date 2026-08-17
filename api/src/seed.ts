import "dotenv/config";
import { prisma } from "./db";
import { hashPassword } from "./utils/password";
import { UserRole } from "@prisma/client";

const SEED_USERS: Array<{
  email: string;
  displayName: string;
  password: string;
  role: UserRole;
}> = [
  {
    email: "amina@bookmarked.dev",
    displayName: "Amina Yusuf",
    password: "password123",
    role: "moderator",
  },
  {
    email: "diego@bookmarked.dev",
    displayName: "Diego Fernandez",
    password: "password123",
    role: "member",
  },
  {
    email: "priya@bookmarked.dev",
    displayName: "Priya Nair",
    password: "password123",
    role: "moderator",
  },
  {
    email: "sam@bookmarked.dev",
    displayName: "Sam Okoro",
    password: "password123",
    role: "member",
  },
];

const SEED_RESOURCES = [
  {
    submittedByEmail: "amina@bookmarked.dev",
    title: "MDN: Async/Await Guide",
    url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await",
    description:
      "The clearest explainer I've found for async/await once callbacks stop making sense.",
    tags: ["javascript", "beginner"],
  },
  {
    submittedByEmail: "diego@bookmarked.dev",
    title: "freeCodeCamp: Responsive Web Design Curriculum",
    url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/",
    description:
      "Where I started with HTML/CSS. Still worth revisiting for flexbox and grid.",
    tags: ["css", "html", "beginner"],
  },
  {
    submittedByEmail: "priya@bookmarked.dev",
    title: "Refactoring UI",
    url: "https://www.refactoringui.com/",
    description:
      "Not free, but changed how I think about spacing and hierarchy in interfaces.",
    tags: ["design"],
  },
  {
    submittedByEmail: "sam@bookmarked.dev",
    title: "Mongoose Population Docs",
    url: "https://mongoosejs.com/docs/populate.html",
    description:
      "Kept getting confused by populate() until I read this twice. (Yes, ironic given we're on Postgres now - the concept of loading related records still applies, just via Prisma's `include`.)",
    tags: ["backend"],
  },
  {
    submittedByEmail: "amina@bookmarked.dev",
    title: "Testing Library Cheatsheet",
    url: "https://testing-library.com/docs/react-testing-library/cheatsheet/",
    description: "Handy reference when I forget the right query to use.",
    tags: ["testing", "react"],
  },
  {
    submittedByEmail: "diego@bookmarked.dev",
    title: "Explain It To Me Like I'm Five: Git Rebase",
    url: "https://www.freecodecamp.org/news/rebasing-and-merging-differences/",
    description: "Finally understood rebase vs merge after reading this.",
    tags: ["git", "beginner"],
  },
];

async function seed() {
  console.log("Connected to Postgres, seeding...");

  // Order matters: reactions/resources reference users via foreign keys.
  await prisma.reaction.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.user.deleteMany({});

  const usersByEmail: Record<string, { id: string }> = {};
  for (const u of SEED_USERS) {
    const passwordHash = await hashPassword(u.password);
    const user = await prisma.user.create({
      data: {
        email: u.email,
        displayName: u.displayName,
        passwordHash,
        role: u.role,
      },
    });
    usersByEmail[u.email] = user;
    console.log(`Created user ${u.email} (${u.role}, password: ${u.password})`);
  }

  const createdResources = [];
  for (const r of SEED_RESOURCES) {
    const submittedBy = usersByEmail[r.submittedByEmail];
    const resource = await prisma.resource.create({
      data: {
        submittedById: submittedBy.id,
        title: r.title,
        url: r.url,
        description: r.description,
        tags: r.tags,
      },
    });
    createdResources.push(resource);
  }
  console.log(`Created ${createdResources.length} resources`);

  // Sprinkle a couple of reactions on the first resource for demo purposes.
  const [firstResource] = createdResources;
  if (firstResource) {
    const reactors = Object.values(usersByEmail).slice(1, 3);
    for (const reactor of reactors) {
      await prisma.reaction.create({
        data: { emoji: "⭐", resourceId: firstResource.id, userId: reactor.id },
      });
    }
  }

  console.log("Seeding complete.");
  await prisma.$disconnect();
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
