// backend/scripts/checkTableStructure.js
const { executeQuery } = require('../config/database');

const checkDocumentsTable = async () => {
  try {
    console.log('🔍 Verificando estructura de la tabla documents...');
    
    // Método 1: DESCRIBE documents
    console.log('\n📋 Usando DESCRIBE documents:');
    const describeResult = await executeQuery('DESCRIBE documents');
    console.table(describeResult);
    
    // Método 2: SHOW CREATE TABLE documents
    console.log('\n🏗️ Usando SHOW CREATE TABLE documents:');
    const createTableResult = await executeQuery('SHOW CREATE TABLE documents');
    console.log(createTableResult[0]['Create Table']);
    
    // Método 3: Information Schema
    console.log('\n📊 Usando INFORMATION_SCHEMA.COLUMNS:');
    const columnsResult = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents'
      ORDER BY ORDINAL_POSITION
    `);
    console.table(columnsResult);
    
    // Crear la consulta INSERT correcta
    console.log('\n✅ Columnas disponibles para INSERT:');
    const columnNames = describeResult.map(col => col.Field);
    console.log('Columnas encontradas:', columnNames);
    
    // Excluir columnas auto-generadas
    const insertableColumns = columnNames.filter(col => 
      !['id', 'created_at', 'updated_at'].includes(col)
    );
    
    console.log('\n📝 INSERT Statement correcto:');
    console.log(`INSERT INTO documents (${insertableColumns.join(', ')}) VALUES (${insertableColumns.map(() => '?').join(', ')})`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
    process.exit(1);
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  checkDocumentsTable();
}

module.exports = { checkDocumentsTable };