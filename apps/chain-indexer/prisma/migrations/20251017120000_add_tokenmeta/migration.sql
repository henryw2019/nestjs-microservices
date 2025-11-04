-- CreateTable
CREATE TABLE "TokenMeta" (
    "tokenAddress" TEXT NOT NULL,
    "name" TEXT,
    "symbol" TEXT,
    "decimals" INTEGER,
    "totalSupply" DECIMAL(65,30),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenMeta_pkey" PRIMARY KEY ("tokenAddress")
);
