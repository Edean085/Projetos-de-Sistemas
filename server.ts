import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization helper for Gemini to prevent startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required to generate reports.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function start() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Route to generate RTA via Gemini
  app.post('/api/generate-rta', async (req, res) => {
    try {
      const visitNumber = req.body.visitaNumero || req.body.visitNumber;
      const ufpa = req.body.ufpa;
      const previousOrientations = req.body.historicoVisitasAnteriores || req.body.previousOrientations;

      if (!visitNumber || !ufpa) {
        return res.status(400).json({ error: "visitNumber e ufpa são obrigatórios." });
      }

      const ai = getGeminiClient();

      // Formulate detailed, contextualized instructions for Gemini
      const prompt = `Você é um Engenheiro Agrônomo e Extensionista Rural experiente do programa Florestas Produtivas da Anater.
Gere textos técnicos e realistas no tempo passado para o Relatório Técnico de Visita Individual (RTA) relacionado à Unidade Familiar de Produção Agrária (UFPA).

DADOS DA UFPA:
- Código da UFPA: ${ufpa.codigo || 'N/A'}
- Agricultor/Denominação: ${ufpa.denominacao || 'N/A'}
- Município: ${ufpa.municipio || 'N/A'}
- Comunidade: ${ufpa.community || 'N/A'}
- Atividade Principal: ${ufpa.mainActivity || 'N/A'}
- Título do Projeto: ${ufpa.projectTitle || 'N/A'}
- Denominação do Grupo: ${ufpa.groupName || 'N/A'}

INFORMAÇÕES DA VISITA ATUAL:
- Número da Visita: Visita nº ${visitNumber}
- Tipo da Visita: ${
        visitNumber === 1 ? 'Visita de cadastro da família e diagnóstico inicial' :
        visitNumber === 2 ? 'Visita de elaboração do projeto produtivo familiar' :
        `Visita de orientação técnica continuada nº ${visitNumber - 2}`
      }

HISTÓRICO DA VISITA ANTERIOR:
${previousOrientations ? `Orientações fornecidas na visita anterior: "${previousOrientations}"` : 'Não foram registradas orientações técnicas anteriores no sistema para esta família.'}

REGRAS DE CONTEÚDO E TEMPORALIDADE (ESTRITO):
1. Todos os textos técnicos devem estar escritos no tempo passado ("foi realizada", "orientou-se", "constatou-se"), pois a visita técnica já ocorreu na propriedade.
2. EIXO PRODUTIVO:
   - Atividade Produtiva: Deve ser "${ufpa.mainActivity || 'Não especificada'}".
   - Etapa da Atividade: Descreva a etapa condizente com a Visita nº ${visitNumber}.
   - Impactos das orientações anteriores:
     * Para visitas de nº 1, 2 e 3: Não deve haver impactos, informe explicitamente que "Não houve impactos de orientações técnicas anteriores ainda na propriedade por se tratar de etapas iniciais de implantação/cadastro".
     * A partir da visita nº 4: Descreva se o agricultor seguiu total ou parcialmente as orientações da visita anterior. Use o histórico fornecido caso exista. O ideal é ressaltar que ele conseguiu implementar parte das melhorias, sendo necessário reforço e novas orientações técnicas.
   - Desenvolvimento da Atividade: Deve conter exatamente 2 parágrafos detalhando como a atividade técnica ocorreu em campo com a família.
   - Problemas Observados: Cite pequenos problemas pontuais e de fácil resolução (ex: pragas iniciais, falta de podas, irrigação desregulada).
   - Recomendações Técnicas: Exatamente 4 parágrafos robustos detalhando manejos, tratos culturais específicos para a atividade principal (${ufpa.mainActivity || 'agropecuária'}), e o encaminhamento para a próxima visita.
   - Resultados de campo com quantidade, unidade (ex: sacos, kg, pés, canteiros, mudas) e estado (Escolha entre: "Projetado", "Parcialmente realizado", ou "Realizado").
3. EIXO SOCIAL:
   - Aborde temas como: regularização documental, acesso a políticas públicas (PAA, PNAE, Pronaf), segurança alimentar e nutricional, saneamento básico, ou participação social e associativismo.
   - Desenvolvimento: Exatamente 1 parágrafo de desenvolvimento.
   - Problemas: Pequenas dificuldades (ex: falta de DAP/CAF ativo, dificuldade de transporte para entrega).
   - Recomendações: Exatamente 3 parágrafos focados em orientações sociais reais.
   - Resultados com descrição, quantidade, unidade e estado.
4. EIXO AMBIENTAL:
   - Escolha pelo menos um ou dois temas entre: Descarte correto de embalagens; controle de queimadas; adubação verde; recuperação de pastagem; cobertura de solo/manejo de plantas; manejo integrado de pragas; recomposição florestal; proteção de nascentes e APPs. Descreva orientações detalhadas sobre ele.
   - Desenvolvimento: Exatamente 1 parágrafo de desenvolvimento ambiental.
   - Recomendações: Exatamente 3 parágrafos de orientações de boas práticas agroambientais.
   - Resultados com descrição, quantidade, unidade e estado.
5. INDICADORES TRABALHADOS (No final):
   Cada um dos 8 indicadores listados na schema deve conter exatamente 1 parágrafo de resumo realista sobre a situação observada ou projetada para a família durante a visita técnica.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              eixoProdutivo: {
                type: Type.OBJECT,
                properties: {
                  tipoAcao: { type: Type.STRING, description: "Tipo de ação realizada na unidade produtiva" },
                  atividade: { type: Type.STRING, description: "Atividade principal produtiva" },
                  etapa: { type: Type.STRING, description: "Etapa técnica da visita atual" },
                  impactos: { type: Type.STRING, description: "Impactos das orientações técnicas anteriores (Conforme regras de visitas 1-3 vs 4+)" },
                  desenvolvimento: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Exatamente 2 parágrafos sobre o desenvolvimento das atividades" 
                  },
                  problemas: { type: Type.STRING, description: "Pequenos problemas técnicos e pontuais observados" },
                  recomendacoes: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Exatamente 4 parágrafos de orientações técnicas e encaminhamentos detalhados" 
                  },
                  resultados: {
                    type: Type.OBJECT,
                    properties: {
                      descricao: { type: Type.STRING },
                      quantidade: { type: Type.INTEGER },
                      unidade: { type: Type.STRING },
                      estado: { type: Type.STRING }
                    },
                    required: ["descricao", "quantidade", "unidade", "estado"]
                  }
                },
                required: ["tipoAcao", "atividade", "etapa", "impactos", "desenvolvimento", "problemas", "recomendacoes", "resultados"]
              },
              eixoSocial: {
                type: Type.OBJECT,
                properties: {
                  tipoAcao: { type: Type.STRING },
                  atividade: { type: Type.STRING },
                  etapa: { type: Type.STRING },
                  impactos: { type: Type.STRING },
                  desenvolvimento: { type: Type.STRING, description: "Exatamente 1 parágrafo de desenvolvimento social" },
                  problemas: { type: Type.STRING },
                  recomendacoes: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Exatamente 3 parágrafos de orientações sociais" 
                  },
                  resultados: {
                    type: Type.OBJECT,
                    properties: {
                      descricao: { type: Type.STRING },
                      quantidade: { type: Type.INTEGER },
                      unidade: { type: Type.STRING },
                      estado: { type: Type.STRING }
                    },
                    required: ["descricao", "quantidade", "unidade", "estado"]
                  }
                },
                required: ["tipoAcao", "atividade", "etapa", "impactos", "desenvolvimento", "problemas", "recomendacoes", "resultados"]
              },
              eixoAmbiental: {
                type: Type.OBJECT,
                properties: {
                  tipoAcao: { type: Type.STRING },
                  atividade: { type: Type.STRING },
                  etapa: { type: Type.STRING },
                  impactos: { type: Type.STRING },
                  desenvolvimento: { type: Type.STRING, description: "Exatamente 1 parágrafo de desenvolvimento ambiental" },
                  problemas: { type: Type.STRING },
                  recomendacoes: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Exatamente 3 parágrafos de orientações ambientais sobre um tema selecionado" 
                  },
                  resultados: {
                    type: Type.OBJECT,
                    properties: {
                      descricao: { type: Type.STRING },
                      quantidade: { type: Type.INTEGER },
                      unidade: { type: Type.STRING },
                      estado: { type: Type.STRING }
                    },
                    required: ["descricao", "quantidade", "unidade", "estado"]
                  }
                },
                required: ["tipoAcao", "atividade", "etapa", "impactos", "desenvolvimento", "problemas", "recomendacoes", "resultados"]
              },
              indicadores: {
                type: Type.OBJECT,
                properties: {
                  segurancaAlimentar: { type: Type.STRING, description: "1 parágrafo resumindo Segurança Alimentar e Nutricional" },
                  propriedadeSustentavel: { type: Type.STRING, description: "1 parágrafo resumindo Propriedade com práticas sustentáveis" },
                  diversificacaoAgroecologica: { type: Type.STRING, description: "1 parágrafo resumindo Diversificação da produção agroecológica" },
                  servicosSociaisBasicos: { type: Type.STRING, description: "1 parágrafo resumindo Serviços Sociais Básicos" },
                  valorBrutoProducao: { type: Type.STRING, description: "1 parágrafo resumindo Valor bruto da produção (Últimos 12 meses)" },
                  acessoPoliticaPublica: { type: Type.STRING, description: "1 parágrafo resumindo Família com acesso a política pública" },
                  canaisComercializacao: { type: Type.STRING, description: "1 parágrafo resumindo Canais de comercialização" },
                  sociobiodiversidade: { type: Type.STRING, description: "1 parágrafo resumindo Sociobiodiversidade" }
                },
                required: [
                  "segurancaAlimentar", "propriedadeSustentavel", "diversificacaoAgroecologica", 
                  "servicosSociaisBasicos", "valorBrutoProducao", "acessoPoliticaPublica", 
                  "canaisComercializacao", "sociobiodiversidade"
                ]
              }
            },
            required: ["eixoProdutivo", "eixoSocial", "eixoAmbiental", "indicadores"]
          }
        }
      });

      const text = response.text || "{}";
      const resultObj = JSON.parse(text.trim());

      const mappedResponse = {
        eixoProdutivo: {
          tipoAcao: resultObj.eixoProdutivo?.tipoAcao || "",
          atividadeProdutiva: resultObj.eixoProdutivo?.atividadeProdutiva || resultObj.eixoProdutivo?.atividade || "",
          etapaAtividade: resultObj.eixoProdutivo?.etapaAtividade || resultObj.eixoProdutivo?.etapa || "",
          impactoOrientacoesAnteriores: resultObj.eixoProdutivo?.impactoOrientacoesAnteriores || resultObj.eixoProdutivo?.impactos || "",
          desenvolvimentoParagrafo1: resultObj.eixoProdutivo?.desenvolvimentoParagrafo1 || resultObj.eixoProdutivo?.desenvolvimento?.[0] || "",
          desenvolvimentoParagrafo2: resultObj.eixoProdutivo?.desenvolvimentoParagrafo2 || resultObj.eixoProdutivo?.desenvolvimento?.[1] || "",
          problemasObservados: resultObj.eixoProdutivo?.problemasObservados || resultObj.eixoProdutivo?.problemas || "",
          recomendacoesParagrafo1: resultObj.eixoProdutivo?.recomendacoesParagrafo1 || resultObj.eixoProdutivo?.recomendacoes?.[0] || "",
          recomendacoesParagrafo2: resultObj.eixoProdutivo?.recomendacoesParagrafo2 || resultObj.eixoProdutivo?.recomendacoes?.[1] || "",
          recomendacoesParagrafo3: resultObj.eixoProdutivo?.recomendacoesParagrafo3 || resultObj.eixoProdutivo?.recomendacoes?.[2] || "",
          recomendacoesParagrafo4PreparoProximoEncontro: resultObj.eixoProdutivo?.recomendacoesParagrafo4PreparoProximoEncontro || resultObj.eixoProdutivo?.recomendacoes?.[3] || "",
          resultadoCampoDescricao: resultObj.eixoProdutivo?.resultadoCampoDescricao || resultObj.eixoProdutivo?.resultados?.descricao || "",
          resultadoCampoQuantidade: String(resultObj.eixoProdutivo?.resultadoCampoQuantidade || resultObj.eixoProdutivo?.resultados?.quantidade || ""),
          resultadoCampoUnidade: resultObj.eixoProdutivo?.resultadoCampoUnidade || resultObj.eixoProdutivo?.resultados?.unidade || "",
          resultadoCampoEstado: resultObj.eixoProdutivo?.resultadoCampoEstado || resultObj.eixoProdutivo?.resultados?.estado || "Realizado"
        },
        eixoSocial: {
          tipoAcao: resultObj.eixoSocial?.tipoAcao || "",
          atividadeSocial: resultObj.eixoSocial?.atividadeSocial || resultObj.eixoSocial?.atividade || "",
          etapaAtividade: resultObj.eixoSocial?.etapaAtividade || resultObj.eixoSocial?.etapa || "",
          impactosObservados: resultObj.eixoSocial?.impactosObservados || resultObj.eixoSocial?.impactos || "",
          desenvolvimentoParagrafoUnico: resultObj.eixoSocial?.desenvolvimentoParagrafoUnico || resultObj.eixoSocial?.desenvolvimento || "",
          problemasObservados: resultObj.eixoSocial?.problemasObservados || resultObj.eixoSocial?.problemas || "",
          recomendacoesParagrafo1: resultObj.eixoSocial?.recomendacoesParagrafo1 || resultObj.eixoSocial?.recomendacoes?.[0] || "",
          recomendacoesParagrafo2: resultObj.eixoSocial?.recomendacoesParagrafo2 || resultObj.eixoSocial?.recomendacoes?.[1] || "",
          recomendacoesParagrafo3: resultObj.eixoSocial?.recomendacoesParagrafo3 || resultObj.eixoSocial?.recomendacoes?.[2] || "",
          resultadoDescricao: resultObj.eixoSocial?.resultadoDescricao || resultObj.eixoSocial?.resultados?.descricao || "",
          resultadoQuantidade: String(resultObj.eixoSocial?.resultadoQuantidade || resultObj.eixoSocial?.resultados?.quantidade || ""),
          resultadoUnidade: resultObj.eixoSocial?.resultadoUnidade || resultObj.eixoSocial?.resultados?.unidade || "",
          resultadoEstado: resultObj.eixoSocial?.resultadoEstado || resultObj.eixoSocial?.resultados?.estado || "Realizado"
        },
        eixoAmbiental: {
          tipoAcao: resultObj.eixoAmbiental?.tipoAcao || "",
          atividadeAmbiental: resultObj.eixoAmbiental?.atividadeAmbiental || resultObj.eixoAmbiental?.atividade || "",
          etapaAtividade: resultObj.eixoAmbiental?.etapaAtividade || resultObj.eixoAmbiental?.etapa || "",
          impactosOrientacoesAnteriores: resultObj.eixoAmbiental?.impactosOrientacoesAnteriores || resultObj.eixoAmbiental?.impactos || "",
          desenvolvimentoParagrafoUnico: resultObj.eixoAmbiental?.desenvolvimentoParagrafoUnico || resultObj.eixoAmbiental?.desenvolvimento || "",
          problemasObservados: resultObj.eixoAmbiental?.problemasObservados || resultObj.eixoAmbiental?.problemas || "",
          recomendacoesParagrafo1: resultObj.eixoAmbiental?.recomendacoesParagrafo1 || resultObj.eixoAmbiental?.recomendacoes?.[0] || "",
          recomendacoesParagrafo2: resultObj.eixoAmbiental?.recomendacoesParagrafo2 || resultObj.eixoAmbiental?.recomendacoes?.[1] || "",
          recomendacoesParagrafo3: resultObj.eixoAmbiental?.recomendacoesParagrafo3 || resultObj.eixoAmbiental?.recomendacoes?.[2] || "",
          resultadoDescricao: resultObj.eixoAmbiental?.resultadoDescricao || resultObj.eixoAmbiental?.resultados?.descricao || "",
          resultadoQuantidade: String(resultObj.eixoAmbiental?.resultadoQuantidade || resultObj.eixoAmbiental?.resultados?.quantidade || ""),
          resultadoUnidade: resultObj.eixoAmbiental?.resultadoUnidade || resultObj.eixoAmbiental?.resultados?.unidade || "",
          resultadoEstado: resultObj.eixoAmbiental?.resultadoEstado || resultObj.eixoAmbiental?.resultados?.estado || "Realizado"
        },
        indicadores: {
          segurancaAlimentar: resultObj.indicadores?.segurancaAlimentar || "",
          propriedadePraticasSustentaveis: resultObj.indicadores?.propriedadePraticasSustentaveis || resultObj.indicadores?.propriedadeSustentavel || "",
          diversificacaoAgroecologica: resultObj.indicadores?.diversificacaoAgroecologica || "",
          servicosSociaisBasicos: resultObj.indicadores?.servicosSociaisBasicos || "",
          valorBrutoProducao: resultObj.indicadores?.valorBrutoProducao || "",
          acessoPoliticaPublica: resultObj.indicadores?.acessoPoliticaPublica || "",
          canaisComercializacao: resultObj.indicadores?.canaisComercializacao || "",
          sociobiodiversidade: resultObj.indicadores?.sociobiodiversidade || ""
        }
      };

      res.json(mappedResponse);
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: error.message || "Erro interno ao gerar RTA." });
    }
  });

  // Setup Vite Dev server or Serve static static assets in Production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    // Catch-all route to serve the SPA index.html for any client-side route
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const viteInstance = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(viteInstance.middlewares);
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is booted and listening on http://0.0.0.0:${port}`);
  });
}

start().catch((err) => {
  console.error("Startup server error:", err);
});
