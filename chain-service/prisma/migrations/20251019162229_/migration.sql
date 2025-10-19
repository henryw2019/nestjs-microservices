/*
  Warnings:

  - You are about to drop the column `created_at` on the `contracts` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `keystore` table. All the data in the column will be lost.
  - You are about to drop the column `private_key` on the `keystore` table. All the data in the column will be lost.
  - Added the required column `privateKey` to the `keystore` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "contracts_address_key";

-- DropIndex
DROP INDEX "keystore_user_id_idx";

-- AlterTable
ALTER TABLE "contracts" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "keystore" DROP COLUMN "created_at",
DROP COLUMN "private_key",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "privateKey" TEXT NOT NULL;
