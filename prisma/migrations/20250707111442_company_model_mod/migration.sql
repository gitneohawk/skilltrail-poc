-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "companySize" TEXT,
ADD COLUMN     "headquarters" JSONB,
ADD COLUMN     "internalContacts" JSONB,
ADD COLUMN     "locations" JSONB;
