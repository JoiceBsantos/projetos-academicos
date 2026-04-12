CREATE DATABASE rede_farmacias; 
USE rede_farmacias;

CREATE TABLE unidade_farmacia (
  id_farmacia INT PRIMARY KEY,
  nome VARCHAR (45) NOT NULL,
  endereco VARCHAR (45) NOT NULL,
  cep CHAR (8) NOT NULL,
  rua VARCHAR (45),
  bairro VARCHAR (45)
);

CREATE TABLE cliente(
  id_cliente INT PRIMARY KEY,
  nome VARCHAR (45) NOT NULL,
  email VARCHAR (45) NOT NULL,
  endereco VARCHAR (45) NOT NULL
);

CREATE TABLE tipo_produto (
  id_produto INT PRIMARY KEY,
  nome VARCHAR (45) NOT NULL,
  descricao VARCHAR (45) NOT NULL,
  categoria VARCHAR (45)
);

CREATE TABLE dimensao_tempo (
  id_dimensao_tempo INT PRIMARY KEY,
  data_saída DATETIME,
  data_entrada DATETIME,
  ponto_reabastecimento DATETIME
);

CREATE TABLE Fornecedor (
    id INT PRIMARY KEY,
    razao_social VARCHAR(45),
    cnpj VARCHAR(14),
    endereco VARCHAR(45)
);

CREATE TABLE forma_pagamento (
  id_pagamento INT PRIMARY KEY,
  descricao varchar(45),
  nota_fiscal varchar (45)
);

CREATE TABLE historico_compras_cliente (
    id INT PRIMARY KEY,
    data_compra DATETIME,
    valor_total FLOAT,
    FOREIGN KEY (cliente_id) 
    REFERENCES cliente(id_cliente)
);

CREATE TABLE funcionario_unidade_farmacia (
  id INT PRIMARY KEY,
  nome VARCHAR (45) not null,
  cpf char (11) not null,
  endereco VARCHAR(45)not null,
  rua VARCHAR(45),
  bairro VARCHAR(45),
  cep VARCHAR(8) not null,
  FOREIGN KEY (id_farmacia) 
  REFERENCES unidade_farmacia (id_unidade_farmacia)
);

CREATE TABLE farmaceutico_funcionario (
  id_farmaceutico INT PRIMARY KEY,
  nome VARCHAR (45),
  crf CHAR (5),
  cpf CHAR (11),
  endereco VARCHAR (45),
  FOREIGN KEY(id_funcionario)
  REFERENCES funcionario(id_funcionario)
);

CREATE TABLE atendente_funcionario (
  id_atendente INT PRIMARY KEY,
  nome VARCHAR (50),
  cpf CHAR (11),
  endereco VARCHAR (100),
  FOREIGN KEY(id_funcionario)
  REFERENCES funcionario (id_funcionario)
);

CREATE TABLE pedido_cliente_funcionario_dimensão_tempo_unidade_farmacia (
  id_pedido INT PRIMARY KEY,
  data_pedido DATETIME, 
  valor_total FLOAT,
  FOREIGN KEY (id_farmacia) 
  REFERENCES unidade_farmacia (id_unidade_farmacia),
  FOREIGN KEY (id_funcionario) 
  REFERENCES funcionario (id_funcionario),
  FOREIGN KEY (id_cliente) 
  REFERENCES cliente (id_cliente),
  FOREIGN KEY (id_dimensao_tempo) 
  REFERENCES dimensao_tempo (id_dimensao_tempo)
);

CREATE TABLE itens_pedido_produto_pedido (
  id_item INT PRIMARY KEY,
  quantidade INT,
  preco FLOAT ,
  desconto DECIMAL (2),
  descricao VARCHAR (45),
  FOREIGN KEY (id_produto)
  REFERENCES produto(id_produto),
  FOREIGN KEY (pedido_id) 
  REFERENCES pedido(id_pedido)
);

CREATE TABLE produto_pedido_tipo_produto (
  id_produto INT PRIMARY KEY,
  nome VARCHAR (45),
  preco FLOAT,
  FOREIGN KEY (id_pedido)
  REFERENCES pedido (id_pedido),
  FOREIGN KEY (id_tipo_produto)
  REFERENCES tipo_produto (id_tipo_produto)
);

CREATE TABLE estoque_produto_dimensão_tempo (
  id_estoque INT PRIMARY KEY,
  quantidade INT,
  categoria VARCHAR (45),
  FOREIGN KEY (id_dimensao_tempo)
  REFERENCES dimensao_tempo(id_dimensao_tempo),
  FOREIGN KEY (id_produto)
  REFERENCES produto (id_produto)
);

CREATE TABLE protuto_fornecedor (
  id_produto INT,
  id_fornecedor INT,
  PRIMARY KEY (id_produto, id_fornecedor),
  FOREIGN KEY (id_produto)
  REFERENCES fornecedor (id_fornecedor),
  FOREIGN KEY (id_fornecedor)
  REFERENCES produto (id_produto)
);
  
CREATE TABLE Telefone (
  id INT PRIMARY KEY AUTO_INCREMENT,
  numero VARCHAR(20),
  tipo VARCHAR(50), -- Exemplo: 'Residencial', 'Comercial', 'Celular'
  entidade_tipo VARCHAR(50), -- Exemplo: 'Unidade_Farmacia', 'Funcionario', 'Fornecedor'
  entidade_id INT
);

