-- Especialidades passam a ter ordem (a tela mostra na ordem cadastrada) e documento/nome de tipo
-- passam a ser únicos só entre os registros não excluídos (a exclusão é lógica).

-- CreateTable
CREATE TABLE "prestador_especialidade" (
    "prestadorId" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "prestador_especialidade_pkey" PRIMARY KEY ("prestadorId","tipoId")
);

-- Copia os vínculos atuais; sem ordem gravada antes, vale a ordem de criação dos tipos.
INSERT INTO "prestador_especialidade" ("prestadorId", "tipoId", "ordem")
SELECT e."A", e."B", ROW_NUMBER() OVER (PARTITION BY e."A" ORDER BY t."criadoEm", t."id") - 1
FROM "_Especialidades" e
JOIN "tipo_demanda" t ON t."id" = e."B";

-- CreateIndex
CREATE INDEX "prestador_especialidade_tipoId_idx" ON "prestador_especialidade"("tipoId");

-- AddForeignKey
ALTER TABLE "prestador_especialidade" ADD CONSTRAINT "prestador_especialidade_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "prestador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestador_especialidade" ADD CONSTRAINT "prestador_especialidade_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "tipo_demanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "_Especialidades" DROP CONSTRAINT "_Especialidades_A_fkey";

-- DropForeignKey
ALTER TABLE "_Especialidades" DROP CONSTRAINT "_Especialidades_B_fkey";

-- DropTable
DROP TABLE "_Especialidades";

-- DropIndex
DROP INDEX "prestador_documento_key";

-- DropIndex
DROP INDEX "tipo_demanda_nome_key";

-- CreateIndex
CREATE UNIQUE INDEX "prestador_documento_ativo_key" ON "prestador"("documento") WHERE ("excluidoEm" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "tipo_demanda_nome_ativo_key" ON "tipo_demanda"("nome") WHERE ("excluidoEm" IS NULL);
