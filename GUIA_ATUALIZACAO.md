# Guia de Edição e Atualização do Site GRAPAS

Este guia prático explica como você pode alterar as notícias do carrossel, as imagens e os textos informativos do seu site diretamente no código.

## 1. Como Alterar o Carrossel de Notícias
O conteúdo do carrossel (títulos, imagens e textos das matérias) está centralizado em uma estrutura chamada `newsData` dentro do arquivo `index.html`.

### Localizando o código:
1. Abra o arquivo `index.html`.
2. Procure pela linha que contém `const newsData = [`. Geralmente está por volta da linha 1280.

### Como editar uma notícia:
Cada notícia está entre chaves `{ ... }`. Veja o que cada campo faz:
- **program:** O nome do programa em letras pequenas (ex: "BOLSA VERDE").
- **title:** O título principal que aparece no banner e no topo da matéria.
- **image:** O link da imagem (ex: `https://link-da-sua-foto.com/imagem.jpg`).
- **date:** A data de publicação.
- **content:** O texto completo da matéria. Você pode usar `<br><br>` para pular linhas.

**Exemplo de edição:**
```javascript
{
    id: 1,
    program: "NOVO PROGRAMA",
    title: "Seu Novo Título Aqui",
    image: "https://seu-link-de-imagem.jpg",
    date: "22/04/2026",
    content: "Texto da sua notícia aqui..."
}
```

---

## 2. Como Alterar Imagens do Site
O site utiliza links de imagens da internet. Para mudar qualquer foto:
1. Procure no arquivo `index.html` pela tag `<img>` ou por propriedades `style="background-image: url('...')"` relacionadas à seção que deseja mudar.
2. Substitua o link entre aspas pelo link da sua nova imagem.

**Dica de Imagens:** Se você quiser usar fotos suas, o ideal é hospedá-las em serviços como o Google Drive (com link público) ou no próprio diretório do seu projeto se estiver usando o GitHub.

---

## 3. Como Alterar Textos Gerais
Todos os textos (Quem Somos, Serviços, etc.) estão dentro de tags HTML como `<h1>`, `<p>`, `<span>`.
1. Use o comando `Ctrl + F` (ou `Cmd + F`) no seu editor.
2. Digite uma frase que já existe no site (ex: "Assistência técnica e extensão rural").
3. Localize o texto no código e apague o antigo, escrevendo o novo entre as tags.

---

## 4. Salvando e Publicando as Mudanças
Se você seguiu as instruções de hospedagem pelo GitHub:
1. Faça a alteração no arquivo `index.html`.
2. Salve o arquivo.
3. Faça o **Commit** e **Push** para o seu repositório no GitHub.
4. O GitHub Pages atualizará o site automaticamente em cerca de 1 minuto.

---

*Nota: Sempre mantenha uma cópia de segurança (backup) do arquivo antes de fazer grandes alterações.*
