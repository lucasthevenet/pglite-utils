-- CreateEnum
CREATE TYPE "type_test_enum_column" AS ENUM ('value1', 'value2', 'value3');

-- CreateEnum
CREATE TYPE "type_test_enum_column_null" AS ENUM ('value1', 'value2', 'value3');

-- CreateTable
CREATE TABLE "type_test" (
    "id" SERIAL NOT NULL,
    "smallint_column" SMALLINT NOT NULL,
    "smallint_column_null" SMALLINT,
    "int_column" INTEGER NOT NULL,
    "int_column_null" INTEGER,
    "bigint_column" BIGINT NOT NULL,
    "bigint_column_null" BIGINT,
    "float_column" REAL NOT NULL,
    "float_column_null" REAL,
    "double_column" DOUBLE PRECISION NOT NULL,
    "double_column_null" DOUBLE PRECISION,
    "decimal_column" DECIMAL(10,2) NOT NULL,
    "decimal_column_null" DECIMAL(10,2),
    "boolean_column" BOOLEAN NOT NULL,
    "boolean_column_null" BOOLEAN,
    "char_column" CHAR(10) NOT NULL,
    "char_column_null" CHAR(10),
    "varchar_column" VARCHAR(255) NOT NULL,
    "varchar_column_null" VARCHAR(255),
    "text_column" TEXT NOT NULL,
    "text_column_null" TEXT,
    "date_column" DATE NOT NULL,
    "date_column_null" DATE,
    "time_column" TIME(0) NOT NULL,
    "time_column_null" TIME(0),
    "datetime_column" TIMESTAMP(3) NOT NULL,
    "datetime_column_null" TIMESTAMP(3),
    "timestamp_column" TIMESTAMP(0) NOT NULL,
    "timestamp_column_null" TIMESTAMP(0),
    "json_column" JSONB NOT NULL,
    "json_column_null" JSONB,
    "enum_column" "type_test_enum_column" NOT NULL,
    "enum_column_null" "type_test_enum_column_null",

    CONSTRAINT "type_test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_test_2" (
    "id" TEXT NOT NULL,
    "datetime_column" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datetime_column_null" TIMESTAMP(3),
    "bigint_column" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "type_test_2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "c" TEXT NOT NULL,
    "c_1" TEXT NOT NULL,
    "c_2" TEXT NOT NULL,
    "parentId" TEXT,
    "non_unique" TEXT,
    "id" TEXT NOT NULL,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parent" (
    "p" TEXT NOT NULL,
    "p_1" TEXT NOT NULL,
    "p_2" TEXT NOT NULL,
    "non_unique" TEXT,
    "id" TEXT NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authors" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "authorId" INTEGER,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "properties" JSONB NOT NULL,
    "properties_null" JSONB,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leak_test" (
    "id" TEXT NOT NULL,

    CONSTRAINT "leak_test_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Child_c_key" ON "Child"("c");

-- CreateIndex
CREATE UNIQUE INDEX "Child_parentId_key" ON "Child"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Child_c_1_c_2_key" ON "Child"("c_1", "c_2");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_p_key" ON "Parent"("p");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_p_1_p_2_key" ON "Parent"("p_1", "p_2");

-- CreateIndex
CREATE INDEX "author_id" ON "Post"("authorId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

