-- Auditoria da importação da planilha de credenciados. Sem chave estrangeira para o usuário: o
-- registro é histórico e sobrevive ao seed (que apaga e recria os usuários).

-- CreateTable
CREATE TABLE "importacao_planilha" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "autorNome" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "novos" INTEGER NOT NULL,
    "atualizados" INTEGER NOT NULL,
    "desativados" INTEGER NOT NULL,
    "ignorados" INTEGER NOT NULL,

    CONSTRAINT "importacao_planilha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "importacao_planilha_em_idx" ON "importacao_planilha"("em");

