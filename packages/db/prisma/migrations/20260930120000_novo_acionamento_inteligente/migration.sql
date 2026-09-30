-- CreateEnum
CREATE TYPE "StatusAssinante" AS ENUM ('ativo', 'inativo');

-- AlterTable
ALTER TABLE "acionamento" ADD COLUMN     "assinanteId" TEXT,
ADD COLUMN     "cep" TEXT;

-- AlterTable
ALTER TABLE "prestador" ADD COLUMN     "cep" TEXT;

-- AlterTable
ALTER TABLE "tipo_demanda" ADD COLUMN     "categoria" TEXT;

-- CreateTable
CREATE TABLE "assinante" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "status" "StatusAssinante" NOT NULL DEFAULT 'ativo',
    "excluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acionamento_assinanteId_idx" ON "acionamento"("assinanteId");

-- AddForeignKey
ALTER TABLE "acionamento" ADD CONSTRAINT "acionamento_assinanteId_fkey" FOREIGN KEY ("assinanteId") REFERENCES "assinante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

