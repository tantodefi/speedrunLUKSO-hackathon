import { builders, comments, submissions, votes } from "./config/schema";
import * as schema from "./config/schema";
import { SubmissionInsert } from "./repositories/submissions";
import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import * as path from "path";
import { Client } from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../.env.development") });

const client = new Client({
  connectionString: process.env.POSTGRES_URL,
});

const seedData: SubmissionInsert[] = [
  {
    title: "First Submission",
    description: "This is a test submission",
    linkToRepository: "https://github.com/test/repo1",
    builderId: "0x123",
    linkToVideo: "https://youtube.com/test1",
    upAddress: "0x456",
    feedback: "Great work!",
    submissionTimestamp: new Date(),
    eligible: null,
    eligibleTimestamp: null,
    eligibleAdmin: null,
  },
  {
    title: "Second Submission",
    description: "Another test submission",
    linkToRepository: "https://github.com/test/repo2",
    builderId: "0x789",
    linkToVideo: "https://youtube.com/test2",
    submissionTimestamp: new Date(),
    eligible: null,
    eligibleTimestamp: null,
    eligibleAdmin: null,
  },
];

async function seed() {
  if (!process.env.POSTGRES_URL?.includes("localhost")) {
    console.error("Cannot seed production database");
    process.exit(1);
  }

  await client.connect();
  const db = drizzle(client, { schema });

  await db.delete(comments).execute();
  await db.delete(votes).execute();
  await db.delete(submissions).execute();
  await db.delete(builders).execute();

  db.insert(builders)
    .values([
      { id: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", role: "admin" },
      { id: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", role: "user" },
      { id: "0x08fc7400ba37fc4ee1bf73bed5ddcb5db6a1036a", role: "voter" },
    ])
    .execute();

  const result = await db.insert(submissions).values(seedData).returning();
  console.log("Seed data inserted successfully:", result);

  await db.insert(comments).values([
    {
      builder: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      comment: "This is a comment",
      submission: result[0].id,
    },
    {
      builder: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      comment: "This is another comment",
      submission: result[0].id,
    },
  ]);

  await db.insert(votes).values([
    {
      builder: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      submission: result[0].id,
      score: 9,
    },
    {
      builder: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      submission: result[1].id,
      score: 7,
    },
  ]);

  console.log("Database seeded successfully");
}

seed()
  .catch(error => {
    console.error("Error seeding database:", error);
  })
  .finally(async () => {
    await client.end();
    process.exit();
  });
