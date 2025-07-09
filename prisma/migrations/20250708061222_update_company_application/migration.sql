-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);
