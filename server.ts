import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase client on server-side
const firebaseConfig = {
  apiKey: "AIzaSyAghu8qI0FdAG2BF4mcXmWzfviidpeIJoA",
  authDomain: "gen-lang-client-0042361490.firebaseapp.com",
  projectId: "gen-lang-client-0042361490",
  storageBucket: "gen-lang-client-0042361490.firebasestorage.app",
  messagingSenderId: "895397185923",
  appId: "1:895397185923:web:b4e69c59d9335de21d0eb6"
};

const firebaseAppInstance = initializeApp(firebaseConfig);
const db_fs = getFirestore(firebaseAppInstance, "ai-studio-afc308e9-5766-47cc-82e4-d006512e64b8");


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

  // --- Homepage Config API & Management Dashboard ---
  const defaultHomepageData = {
    header: {
      logoText: "GRAPAS",
      fullName: "GR Assessoria e Planejamento de Projetos Agropecuários"
    },
    banner: {
      title: "Assistência técnica e extensão rural para a agricultura familiar.",
      subtitle: "Apoiamos produtores rurais com soluções técnicas inovadoras, planejamento estratégico e gestão de projetos para fortalecer o campo.",
      buttonProjectsText: "Nossos Projetos",
      buttonContactText: "Fale com a gente",
      backgroundImage: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
    },
    empresa: {
      name: "GR ASSESSORIA E PLANEJAMENTO DE PROJETOS AGROPECUARIOS LTDA",
      cnpj: "24.230.134/0001-50",
      address: "Rodovia Mário Covas, Coqueiro, Ananindeua - PA"
    },
    footer: {
      slogan: "Compromisso com o desenvolvimento rural e sustentável da região.",
      email: "rosaligrapas@yahoo.com.br",
      phone: "(91) 99270-7555",
      address: "Rua Rio Solimões, S/N, Quadra16, Casa 01, Parque Marajó - CEP: 68.473-000 – Novo Repartimento-PA"
    },
    news: [
      {
        id: 1,
        program: "BOLSA VERDE",
        title: "Equipe técnica da GR Assessoria e ICMBio realizam mutirão com agricultores familiares da comunidade São Domingos",
        image: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?q=80&w=1200&auto=format&fit=crop",
        date: "22/04/2026",
        content: "Em uma ação conjunta focada na sustentabilidade e no apoio ao produtor rural, a equipe técnica da GR Assessoria se uniu ao ICMBio para realizar um grande mutirão na comunidade de São Domingos. O evento reuniu dezenas de famílias e focou na regularização documental e orientação técnica para o programa Bolsa Verde. <br><br> Durante o mutirão, foram realizados atendimentos personalizados, esclarecimento de dúvidas sobre o manejo sustentável das áreas e a importância da preservação ambiental como fonte de renda. 'Essa parceria é fundamental para levar dignidade e conhecimento ao campo', afirmou um dos coordenadores técnicos presentes."
      },
      {
        id: 2,
        program: "FLORESTAS PRODUTIVAS",
        title: "Agricultores familiares da comunidade Resex Marinha de Soure são contemplados com o fomento mulher nesta última sexta-feira (17/04)",
        image: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?q=80&w=1200&auto=format&fit=crop",
        date: "17/04/2026",
        content: "A última sexta-feira foi de celebração para as mulheres agricultoras da Resex Marinha de Soure. Através do programa Florestas Produtivas, diversas produtoras receberam o Fomento Mulher, um recurso destinado a impulsionar pequenos empreendimentos rurais liderados por mulheres. <br><br> A GR Assessoria prestou todo o suporte técnico na elaboração dos projetos e continuará acompanhando a aplicação dos recursos para garantir que as metas produtivas sejam alcançadas, fortalecendo a economy local e o protagonismo feminino na região."
      },
      {
        id: 3,
        program: "BOLSA VERDE",
        title: "Equipe técnica da GR Assessoria realiza a implantação de uma unidade demonstrativa de referência na comunidade Jaguarary, município de Belterra/PA",
        image: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?q=80&w=1200&auto=format&fit=crop",
        date: "10/04/2026",
        content: "A comunidade Jaguarary, em Belterra, agora conta com uma Unidade Demonstrativa (UD) de referência. Implantada pela equipe da GR Assessoria no âmbito do programa Bolsa Verde, a unidade visa servir como campo de aprendizado prático para agricultores da região. <br><br> Na UD, são aplicadas técnicas de agroecologia, manejo de solo e diversificação de culturas. O objetivo é mostrar que é possível produzir com eficiência mantendo a floresta em pé e os recursos naturais preservados para as futuras gerações."
      },
      {
        id: 4,
        program: "FLORESTAS PRODUTIVAS",
        title: "Agricultores familiares do PA Abril Vermelho são contemplados com o título dos seus lotes em evento promovido pelo INCRA e o município de Santa Bárbara do Pará",
        image: "https://images.unsplash.com/photo-1605001011156-cbf0b0f67a51?q=80&w=1200&auto=format&fit=crop",
        date: "05/04/2026",
        content: "A segurança jurídica chegou para as famílias do PA Abril Vermelho. Em um evento emocionante realizado em parceria com o INCRA e a prefeitura de Santa Bárbara do Pará, centenas de agricultores receberam os títulos definitivos de seus lotes. <br><br> A GR Assessoria atuou intensamente no georreferenciamento das áreas e na organização da documentação técnica necessária. 'O título da terra é o início de um novo ciclo de investimentos e tranquilidade para o agricultor', destacou a gerência da empresa durante a cerimônia."
      }
    ],
    gallery: [
      {
        program: "União Com Municípios",
        coverImage: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1464226184884-fa280b87c399",
          "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09",
          "https://images.unsplash.com/photo-1434144893279-2a9fc14e9337"
        ]
      },
      {
        program: "Florestas Produtivas",
        coverImage: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1595841696662-5083d30b3565",
          "https://images.unsplash.com/photo-1501183638710-841dd1904471",
          "https://images.unsplash.com/photo-1441974231531-c6227db76b6e"
        ]
      },
      {
        program: "Bolsa Verde",
        coverImage: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2",
          "https://images.unsplash.com/photo-1597433333333-31123d463d80",
          "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc"
        ]
      },
      {
        program: "Produzir Brasil",
        coverImage: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1592982537447-7440770cbfc9",
          "https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a",
          "https://images.unsplash.com/photo-1502481851512-e9e2529bbbf9"
        ]
      },
      {
        program: "Brasil Mais Cooperativo",
        coverImage: "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1560493676-04071c5f467b",
          "https://images.unsplash.com/photo-1454165833767-027eeed9b76a",
          "https://images.unsplash.com/photo-1522202176988-66273c2fd55f"
        ]
      },
      {
        program: "PDHC-Dom Hélder Câmara",
        coverImage: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1589923188900-85dae523342b",
          "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
          "https://images.unsplash.com/photo-1473448912268-2022ce9509d8"
        ]
      },
      {
        program: "PNCF-Crédito Fundiário",
        coverImage: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
          "https://images.unsplash.com/photo-1502481851512-e9e2529bbbf9",
          "https://images.unsplash.com/photo-1542601032-348daefde07c"
        ]
      },
      {
        program: "Mais Gestão PA e MA",
        coverImage: "https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&w=800&q=80",
        images: [
          "https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5",
          "https://images.unsplash.com/photo-1454166159281-175908ce80a1",
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4"
        ]
      }
    ]
  };

  const API_KEY = process.env.HOMEPAGE_API_KEY || "grapas-admin-key-2026";

  const authorizeHomepageApi = (req: any, res: any, next: any) => {
    const key = req.query.api_key || req.headers['x-api-key'];
    if (key !== API_KEY) {
      return res.status(401).json({
        error: "Não autorizado. Por favor forneça uma 'api_key' válida por parâmetro na URL ou pelo cabeçalho 'x-api-key'."
      });
    }
    next();
  };

  // GET /api/homepage - Retrieves current homepage details
  app.get('/api/homepage', authorizeHomepageApi, async (req, res) => {
    try {
      const docRef = doc(db_fs, "config", "homepage");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return res.json(docSnap.data());
      } else {
        await setDoc(docRef, defaultHomepageData);
        return res.json(defaultHomepageData);
      }
    } catch (err: any) {
      console.error("Erro ao carregar configurações da home:", err);
      return res.status(500).json({ error: "Erro ao obter dados do banco.", details: err.message });
    }
  });

  // POST /api/homepage - Updates homepage details
  app.post('/api/homepage', authorizeHomepageApi, async (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: "Payload inválido." });
      }

      // Save homepage details
      const docRef = doc(db_fs, "config", "homepage");
      await setDoc(docRef, payload);

      // Sync company info as well for backward compatibility
      if (payload.empresa) {
        const empresaRef = doc(db_fs, "config", "empresa");
        await setDoc(empresaRef, payload.empresa);
      }

      return res.json({ success: true, message: "Informações da home page atualizadas com sucesso!" });
    } catch (err: any) {
      console.error("Erro ao salvar configurações da home:", err);
      return res.status(500).json({ error: "Erro ao atualizar dados no banco.", details: err.message });
    }
  });

  // GET /api/homepage/manage - Serves the beautiful Admin Dashboard to edit everything visually from the browser
  app.get('/api/homepage/manage', (req, res) => {
    const key = req.query.api_key || "";
    
    // Serve HTML page
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Painel de Edição da Home Page - GRAPAS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body {
      font-family: 'Outfit', sans-serif;
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col">

  <!-- Header -->
  <header class="bg-[#1b4332] text-white shadow-lg sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="bg-white text-[#1b4332] font-bold px-3 py-1 rounded-lg text-xl tracking-tight">
          GRAPAS API
        </div>
        <div>
          <h1 class="text-lg font-bold">Painel de Gerenciamento da Home</h1>
          <p class="text-xs text-green-200">Altere todas as imagens, textos, títulos e carrosséis</p>
        </div>
      </div>
      
      <div class="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
        <span class="text-xs font-semibold text-green-200 uppercase">Chave de Acesso:</span>
        <input type="password" id="api-key-input" value="${key}" class="bg-transparent border-none text-white text-sm font-mono focus:outline-none w-44" placeholder="Chave da API">
        <button onclick="toggleKeyVisibility()" class="text-green-300 hover:text-white"><i class="fa-solid fa-eye" id="eye-icon"></i></button>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="flex-grow max-w-7xl w-full mx-auto px-4 py-8">
    
    <!-- Token missing error -->
    <div id="unauthorized-alert" class="hidden bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 shadow-md">
      <div class="flex items-center gap-2 font-bold mb-1">
        <i class="fa-solid fa-triangle-exclamation"></i> Chave de Acesso Inválida ou Ausente
      </div>
      <p class="text-sm">Por favor, insira a chave de acesso correta no campo superior para carregar e gerenciar os dados da Home Page.</p>
    </div>

    <!-- Instructions / REST specs -->
    <div class="bg-blue-50 border-l-4 border-blue-500 text-blue-900 p-4 rounded-lg mb-8 shadow-sm">
      <h3 class="font-bold text-sm flex items-center gap-1"><i class="fa-solid fa-circle-info"></i> Como acessar por API REST (Navegador/HTTP):</h3>
      <ul class="text-xs space-y-1 mt-2 font-mono">
        <li><strong>GET:</strong> /api/homepage?api_key=SUA_CHAVE (Obter dados como JSON)</li>
        <li><strong>POST:</strong> /api/homepage?api_key=SUA_CHAVE (Atualizar dados via JSON)</li>
      </ul>
    </div>

    <!-- Loader -->
    <div id="loader" class="flex flex-col items-center justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b4332] mb-4"></div>
      <p class="text-slate-500 font-semibold animate-pulse">Carregando informações da Home Page...</p>
    </div>

    <!-- Main Content Grid -->
    <div id="dashboard-content" class="hidden">
      
      <!-- Nav Tabs -->
      <div class="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-2">
        <button onclick="switchTab('geral')" id="tab-geral" class="tab-btn px-4 py-2 font-semibold text-sm rounded-lg bg-[#1b4332] text-white transition-all shadow-sm">Geral e Cabeçalho</button>
        <button onclick="switchTab('banner')" id="tab-banner" class="tab-btn px-4 py-2 font-semibold text-sm rounded-lg bg-white text-slate-600 hover:bg-slate-100 transition-all">Banner Principal</button>
        <button onclick="switchTab('noticias')" id="tab-noticias" class="tab-btn px-4 py-2 font-semibold text-sm rounded-lg bg-white text-slate-600 hover:bg-slate-100 transition-all">Matérias (Carrossel Flip)</button>
        <button onclick="switchTab('galeria')" id="tab-galeria" class="tab-btn px-4 py-2 font-semibold text-sm rounded-lg bg-white text-slate-600 hover:bg-slate-100 transition-all">Projetos (Galeria)</button>
        <button onclick="switchTab('rodape')" id="tab-rodape" class="tab-btn px-4 py-2 font-semibold text-sm rounded-lg bg-white text-slate-600 hover:bg-slate-100 transition-all">Rodapé</button>
      </div>

      <!-- Form container -->
      <div class="bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-8">
        
        <!-- Tab: Geral -->
        <div id="content-geral" class="tab-content">
          <h2 class="text-xl font-bold text-[#1b4332] mb-6 flex items-center gap-2"><i class="fa-solid fa-building"></i> Informações Gerais e Cabeçalho</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Texto Curto do Logotipo (Cabeçalho)</label>
              <input type="text" id="g-header-logo" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332] font-semibold">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nome Completo no Cabeçalho</label>
              <input type="text" id="g-header-name" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332] font-semibold">
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Razão Social da Empresa</label>
              <input type="text" id="g-empresa-name" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332]">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">CNPJ</label>
              <input type="text" id="g-empresa-cnpj" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332] font-mono">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Endereço Principal da Empresa</label>
              <input type="text" id="g-empresa-address" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332]">
            </div>
          </div>
        </div>

        <!-- Tab: Banner -->
        <div id="content-banner" class="tab-content hidden">
          <h2 class="text-xl font-bold text-[#1b4332] mb-6 flex items-center gap-2"><i class="fa-solid fa-image"></i> Banner do Topo (Hero Section)</h2>
          
          <div class="grid grid-cols-1 gap-6">
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Título Principal (H1)</label>
              <input type="text" id="b-title" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332] font-bold text-lg">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Subtítulo do Banner</label>
              <textarea id="b-subtitle" rows="3" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"></textarea>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Texto do Botão 1 (Projetos)</label>
                <input type="text" id="b-btn-projects" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332] font-semibold">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Texto do Botão 2 (Contato/Fale Conosco)</label>
                <input type="text" id="b-btn-contact" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332] font-semibold">
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">URL da Imagem de Fundo (Unsplash, etc.)</label>
              <input type="text" id="b-background" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332] font-mono">
              <div class="mt-2 text-xs text-slate-500">Insira um link direto de imagem. Ex: <code>https://images.unsplash.com/photo-1500382017468-9049fed747ef...</code></div>
            </div>
          </div>
        </div>

        <!-- Tab: Matérias -->
        <div id="content-noticias" class="tab-content hidden">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-[#1b4332] flex items-center gap-2"><i class="fa-solid fa-newspaper"></i> Matérias do Carrossel Flip</h2>
            <button onclick="addNewsItem()" class="bg-[#1b4332] text-white px-4 py-2 rounded-xl font-bold text-sm hover:shadow-md transition-all flex items-center gap-1">
              <i class="fa-solid fa-plus"></i> Adicionar Nova Matéria
            </button>
          </div>

          <div id="news-container" class="space-y-6">
            <!-- News list dynamic rendering -->
          </div>
        </div>

        <!-- Tab: Galeria -->
        <div id="content-galeria" class="tab-content hidden">
          <h2 class="text-xl font-bold text-[#1b4332] mb-6 flex items-center gap-2"><i class="fa-solid fa-images"></i> Álbuns e Galeria de Projetos</h2>
          
          <div id="gallery-container" class="space-y-8">
            <!-- Galleries dynamic list -->
          </div>
        </div>

        <!-- Tab: Rodapé -->
        <div id="content-rodape" class="tab-content hidden">
          <h2 class="text-xl font-bold text-[#1b4332] mb-6 flex items-center gap-2"><i class="fa-solid fa-hashtag"></i> Informações do Rodapé</h2>
          
          <div class="grid grid-cols-1 gap-6">
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Slogan / Frase de Impacto</label>
              <input type="text" id="f-slogan" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332]">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">E-mail de Contato</label>
                <input type="email" id="f-email" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332]">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Telefone de Contato</label>
                <input type="text" id="f-phone" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332]">
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Endereço Completo (Texto de Exibição no Rodapé)</label>
              <textarea id="f-address" rows="3" class="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"></textarea>
            </div>
          </div>
        </div>

        <!-- Action Bar -->
        <div class="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p class="text-xs text-slate-400">As alterações serão gravadas diretamente no Firestore.</p>
          
          <div class="flex gap-4">
            <button onclick="loadHomepageData()" class="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2">
              <i class="fa-solid fa-arrows-rotate"></i> Descartar
            </button>
            <button onclick="saveHomepageData()" class="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 hover:shadow-lg transition-all flex items-center gap-2">
              <i class="fa-solid fa-floppy-disk"></i> Salvar Alterações
            </button>
          </div>
        </div>

      </div>

    </div>
  </main>

  <!-- Footer -->
  <footer class="bg-slate-100 border-t border-slate-200 py-6 text-center text-xs text-slate-500">
    <p>&copy; 2026 GR Assessoria e Planejamento. Todos os direitos reservados. Painel Administrativo de API.</p>
  </footer>

  <!-- Toast Notification -->
  <div id="toast" class="fixed bottom-5 right-5 z-[5000] bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all transform translate-y-20 opacity-0">
    <i class="fa-solid fa-circle-check text-emerald-400 text-lg" id="toast-icon"></i>
    <span id="toast-message" class="font-semibold text-sm">Salvo com sucesso!</span>
  </div>

  <script>
    let rawHomepageData = null;
    let activeTab = 'geral';

    document.addEventListener('DOMContentLoaded', () => {
      const apiKeyInput = document.getElementById('api-key-input');
      apiKeyInput.addEventListener('change', () => {
        loadHomepageData();
      });

      loadHomepageData();
    });

    function toggleKeyVisibility() {
      const input = document.getElementById('api-key-input');
      const icon = document.getElementById('eye-icon');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
      }
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById('content-' + tabId).classList.remove('hidden');

      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-[#1b4332]', 'text-white');
        btn.classList.add('bg-white', 'text-slate-600', 'hover:bg-slate-100');
      });

      const activeBtn = document.getElementById('tab-' + tabId);
      activeBtn.classList.remove('bg-white', 'text-slate-600', 'hover:bg-slate-100');
      activeBtn.classList.add('bg-[#1b4332]', 'text-white');
      
      activeTab = tabId;
    }

    function showToast(message, isError = false) {
      const toast = document.getElementById('toast');
      const icon = document.getElementById('toast-icon');
      const msg = document.getElementById('toast-message');

      msg.innerText = message;
      if (isError) {
        icon.className = 'fa-solid fa-triangle-exclamation text-red-400 text-lg';
      } else {
        icon.className = 'fa-solid fa-circle-check text-emerald-400 text-lg';
      }

      toast.classList.remove('translate-y-20', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');

      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
      }, 4000);
    }

    async function loadHomepageData() {
      const apiKey = document.getElementById('api-key-input').value.trim();
      const loader = document.getElementById('loader');
      const content = document.getElementById('dashboard-content');
      const unauthAlert = document.getElementById('unauthorized-alert');

      if (!apiKey) {
        loader.classList.add('hidden');
        content.classList.add('hidden');
        unauthAlert.classList.remove('hidden');
        return;
      }

      loader.classList.remove('hidden');
      content.classList.add('hidden');
      unauthAlert.classList.add('hidden');

      try {
        const res = await fetch('/api/homepage?api_key=' + encodeURIComponent(apiKey));
        if (res.status === 401) {
          loader.classList.add('hidden');
          unauthAlert.classList.remove('hidden');
          return;
        }

        if (!res.ok) {
          throw new Error('Falha ao carregar as configurações');
        }

        const data = await res.json();
        rawHomepageData = data;
        
        // Populate inputs
        // Tab: Geral
        document.getElementById('g-header-logo').value = data.header?.logoText || '';
        document.getElementById('g-header-name').value = data.header?.fullName || '';
        document.getElementById('g-empresa-name').value = data.empresa?.name || '';
        document.getElementById('g-empresa-cnpj').value = data.empresa?.cnpj || '';
        document.getElementById('g-empresa-address').value = data.empresa?.address || '';

        // Tab: Banner
        document.getElementById('b-title').value = data.banner?.title || '';
        document.getElementById('b-subtitle').value = data.banner?.subtitle || '';
        document.getElementById('b-btn-projects').value = data.banner?.buttonProjectsText || '';
        document.getElementById('b-btn-contact').value = data.banner?.buttonContactText || '';
        document.getElementById('b-background').value = data.banner?.backgroundImage || '';

        // Tab: Rodapé
        document.getElementById('f-slogan').value = data.footer?.slogan || '';
        document.getElementById('f-email').value = data.footer?.email || '';
        document.getElementById('f-phone').value = data.footer?.phone || '';
        document.getElementById('f-address').value = data.footer?.address || '';

        // Tab: News/Matérias
        renderNewsList(data.news || []);

        // Tab: Galleries
        renderGalleryList(data.gallery || []);

        loader.classList.add('hidden');
        content.classList.remove('hidden');
      } catch (err) {
        console.error(err);
        loader.classList.add('hidden');
        showToast('Erro ao se conectar com o servidor da API.', true);
      }
    }

    // --- News / Carousel Handler ---
    function renderNewsList(newsArray) {
      const container = document.getElementById('news-container');
      if (newsArray.length === 0) {
        container.innerHTML = \`<div class="p-8 border border-dashed border-slate-200 text-center rounded-xl text-slate-400">Nenhuma matéria adicionada ainda.</div>\`;
        return;
      }

      container.innerHTML = newsArray.map((news, index) => \`
        <div class="border border-slate-200 rounded-2xl p-5 bg-slate-50 relative flex flex-col gap-4 group hover:border-[#1b4332] transition-colors shadow-sm" data-news-id="\${news.id}">
          <div class="absolute top-4 right-4 flex gap-2">
            <button onclick="moveNewsItem(\${index}, -1)" class="bg-white hover:bg-slate-100 text-slate-600 p-2 border border-slate-200 rounded-lg text-xs" title="Mover para Cima"><i class="fa-solid fa-arrow-up"></i></button>
            <button onclick="moveNewsItem(\${index}, 1)" class="bg-white hover:bg-slate-100 text-slate-600 p-2 border border-slate-200 rounded-lg text-xs" title="Mover para Baixo"><i class="fa-solid fa-arrow-down"></i></button>
            <button onclick="deleteNewsItem(\${index})" class="bg-red-50 hover:bg-red-100 text-red-600 p-2 border border-red-200 rounded-lg text-xs" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
          </div>

          <div class="flex items-center gap-2 mb-2">
            <span class="bg-[#1b4332] text-white rounded-full h-6 w-6 inline-flex items-center justify-center text-xs font-bold font-mono">#\${index + 1}</span>
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Matéria do Carrossel</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="md:col-span-1">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Programa / Categoria</label>
              <input type="text" class="news-program w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1b4332] font-semibold text-emerald-700" value="\${news.program || ''}">
            </div>
            <div class="md:col-span-2">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Título da Matéria</label>
              <input type="text" class="news-title w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1b4332] font-bold" value="\${news.title || ''}">
            </div>
            <div class="md:col-span-1">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data de Publicação</label>
              <input type="text" class="news-date w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1b4332]" value="\${news.date || ''}">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="md:col-span-2">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Link da Imagem</label>
              <input type="text" class="news-image w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1b4332] font-mono text-xs" value="\${news.image || ''}" onchange="updateNewsPreview(this, \${index})">
              <div class="mt-2 h-20 rounded-xl overflow-hidden bg-slate-200 border border-slate-300">
                <img src="\${news.image || ''}" class="w-full h-full object-cover news-preview-\${index}" onerror="this.src='https://placehold.co/400x200?text=Imagem+Indisponivel'">
              </div>
            </div>
            <div class="md:col-span-2">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Conteúdo Completo (HTML Permitido)</label>
              <textarea rows="5" class="news-content w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1b4332] font-mono">\${news.content || ''}</textarea>
            </div>
          </div>
        </div>
      \`).join('');
    }

    function updateNewsPreview(input, index) {
      const img = document.querySelector('.news-preview-' + index);
      if (img) {
        img.src = input.value.trim();
      }
    }

    function addNewsItem() {
      const newItem = {
        id: Date.now(),
        program: "GERAL",
        title: "Novo Título de Matéria",
        image: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?q=80&w=1200",
        date: "23/06/2026",
        content: "Escreva aqui o conteúdo da sua matéria."
      };
      
      const currentNews = getCollectedNews();
      currentNews.push(newItem);
      renderNewsList(currentNews);
    }

    function deleteNewsItem(index) {
      const currentNews = getCollectedNews();
      currentNews.splice(index, 1);
      renderNewsList(currentNews);
    }

    function moveNewsItem(index, direction) {
      const currentNews = getCollectedNews();
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= currentNews.length) return;

      const temp = currentNews[index];
      currentNews[index] = currentNews[targetIndex];
      currentNews[targetIndex] = temp;
      
      renderNewsList(currentNews);
    }

    function getCollectedNews() {
      const container = document.getElementById('news-container');
      const cards = container.querySelectorAll('[data-news-id]');
      const collected = [];
      cards.forEach((card, idx) => {
        collected.push({
          id: parseInt(card.dataset.newsId) || (idx + 1),
          program: card.querySelector('.news-program').value.trim(),
          title: card.querySelector('.news-title').value.trim(),
          image: card.querySelector('.news-image').value.trim(),
          date: card.querySelector('.news-date').value.trim(),
          content: card.querySelector('.news-content').value.trim()
        });
      });
      return collected;
    }

    // --- Gallery Handler ---
    function renderGalleryList(galleries) {
      const container = document.getElementById('gallery-container');
      if (galleries.length === 0) {
        container.innerHTML = \`<div class="p-8 border border-dashed border-slate-200 text-center rounded-xl text-slate-400">Nenhum álbum configurado.</div>\`;
        return;
      }

      container.innerHTML = galleries.map((g, index) => \`
        <div class="border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col gap-4 shadow-sm" data-gallery-program="\${g.program}">
          <div class="flex items-center gap-2 border-b border-slate-200 pb-3 mb-2">
            <span class="bg-[#1b4332] text-white rounded-xl px-2.5 py-0.5 text-xs font-bold font-mono">Álbum \${index + 1}</span>
            <span class="text-sm font-bold text-emerald-800 uppercase tracking-widest">\${g.program}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Program Name (Read-Only to preserve mapping) -->
            <div class="md:col-span-1">
              <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Programa/Categoria (Fixo para Link)</label>
              <input type="text" class="gallery-program-name w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-200 text-slate-600 font-bold" value="\${g.program}" readonly>
            </div>
            
            <!-- Cover Image -->
            <div class="md:col-span-2">
              <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Imagem Principal do Grid de Projetos</label>
              <input type="text" class="gallery-cover-image w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1b4332] font-mono text-xs" value="\${g.coverImage || ''}">
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Imagens Internas do Álbum (Uma URL por linha)</label>
            <textarea class="gallery-images w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1b4332] font-mono" rows="4">\${(g.images || []).join('\\n')}</textarea>
            <div class="mt-1 text-[10px] text-slate-500">Cole cada link direto de imagem em uma nova linha. O modal exibirá estas imagens no carrossel ampliado.</div>
          </div>
        </div>
      \`).join('');
    }

    function getCollectedGalleries() {
      const container = document.getElementById('gallery-container');
      const cards = container.querySelectorAll('[data-gallery-program]');
      const collected = [];
      cards.forEach(card => {
        const rawImagesText = card.querySelector('.gallery-images').value.trim();
        const imagesList = rawImagesText ? rawImagesText.split('\\n').map(u => u.trim()).filter(Boolean) : [];
        collected.push({
          program: card.querySelector('.gallery-program-name').value.trim(),
          coverImage: card.querySelector('.gallery-cover-image').value.trim(),
          images: imagesList
        });
      });
      return collected;
    }

    // --- Save Data ---
    async function saveHomepageData() {
      const apiKey = document.getElementById('api-key-input').value.trim();
      if (!apiKey) {
        showToast('Chave de acesso ausente.', true);
        return;
      }

      const savingBtn = document.querySelector('button[onclick="saveHomepageData()"]');
      const originalText = savingBtn.innerHTML;
      savingBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Salvando...';
      savingBtn.disabled = true;

      try {
        const payload = {
          header: {
            logoText: document.getElementById('g-header-logo').value.trim(),
            fullName: document.getElementById('g-header-name').value.trim()
          },
          banner: {
            title: document.getElementById('b-title').value.trim(),
            subtitle: document.getElementById('b-subtitle').value.trim(),
            buttonProjectsText: document.getElementById('b-btn-projects').value.trim(),
            buttonContactText: document.getElementById('b-btn-contact').value.trim(),
            backgroundImage: document.getElementById('b-background').value.trim()
          },
          empresa: {
            name: document.getElementById('g-empresa-name').value.trim(),
            cnpj: document.getElementById('g-empresa-cnpj').value.trim(),
            address: document.getElementById('g-empresa-address').value.trim()
          },
          footer: {
            slogan: document.getElementById('f-slogan').value.trim(),
            email: document.getElementById('f-email').value.trim(),
            phone: document.getElementById('f-phone').value.trim(),
            address: document.getElementById('f-address').value.trim()
          },
          news: getCollectedNews(),
          gallery: getCollectedGalleries()
        };

        const res = await fetch('/api/homepage?api_key=' + encodeURIComponent(apiKey), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || 'Erro ao salvar alterações');
        }

        showToast('As informações do site foram atualizadas em tempo real!');
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Erro ao salvar configurações.', true);
      } finally {
        savingBtn.innerHTML = originalText;
        savingBtn.disabled = false;
      }
    }
  </script>
</body>
</html>
    `);
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
