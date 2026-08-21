/*
  Warnings:

  - A unique constraint covering the columns `[userId,name]` on the table `Collection` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Collection_userId_name_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Collection_userId_name_key" ON "Collection"("userId", "name");
