-- AlterTable
ALTER TABLE "ERC20Transfer" ADD COLUMN     "timestamp" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EventLog" ADD COLUMN     "timestamp" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Tx" ADD COLUMN     "balanceAfter" DECIMAL(65,30),
ADD COLUMN     "gasFee" DECIMAL(65,30),
ADD COLUMN     "gasUsed" BIGINT,
ADD COLUMN     "input" TEXT,
ADD COLUMN     "nonce" INTEGER,
ADD COLUMN     "status" INTEGER,
ADD COLUMN     "timestamp" TIMESTAMP(3);
