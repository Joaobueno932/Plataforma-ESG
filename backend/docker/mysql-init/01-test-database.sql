-- Base de testes, para que `npm test` rode isolado do banco de trabalho.
CREATE DATABASE IF NOT EXISTS plataforma_esg_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- O usuário da aplicação administra o banco de trabalho, a base de testes e as bases
-- temporárias criadas pela conferência de backup (`plataforma_esg_dryrun`). O curinga cobre
-- esses nomes sem dar alcance a outros bancos do servidor.
GRANT ALL PRIVILEGES ON `plataforma_esg`.* TO 'esg'@'%';
GRANT ALL PRIVILEGES ON `plataforma\_esg\_%`.* TO 'esg'@'%';
FLUSH PRIVILEGES;
