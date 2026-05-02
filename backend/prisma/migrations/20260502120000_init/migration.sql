-- CreateTable
CREATE TABLE "financial_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grossSalary" DECIMAL(14,2) NOT NULL,
    "bankNet" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spending_plans" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "fixedCosts" DECIMAL(14,2) NOT NULL,
    "savingsGoals" DECIMAL(14,2) NOT NULL,
    "activeInvestments" DECIMAL(14,2) NOT NULL,
    "guiltFreeSpending" DECIMAL(14,2) NOT NULL,
    "annualReturnRate" DECIMAL(6,4) NOT NULL DEFAULT 0.07,
    "projectionYears" INTEGER NOT NULL DEFAULT 15,
    "projectionData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spending_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "spending_plans_profileId_key" ON "spending_plans"("profileId");

-- AddForeignKey
ALTER TABLE "spending_plans" ADD CONSTRAINT "spending_plans_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "financial_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

