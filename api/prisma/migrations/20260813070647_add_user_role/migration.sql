-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('member', 'moderator');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'member';
