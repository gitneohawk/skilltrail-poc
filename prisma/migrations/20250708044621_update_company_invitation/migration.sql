-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "ApprovedEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApprovedEmail_email_key" ON "ApprovedEmail"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("corporateNumber") ON DELETE RESTRICT ON UPDATE CASCADE;
