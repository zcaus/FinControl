import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

export const getFinancialAdvice = async (transactions: Transaction[], balance: number): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepare a summary payload to avoid token limits with raw large lists
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);

  const prompt = `
    Atue como um consultor financeiro pessoal experiente. Analise os seguintes dados financeiros JSON e forneça 3 insights ou dicas acionáveis e concisas para melhorar a saúde financeira. Foque em hábitos de gastos, potencial de economia e despesas recorrentes. Mantenha o tom profissional, mas encorajador. Responda estritamente em Português do Brasil.

    Saldo Atual: ${balance}
    Dados de Transações Recentes:
    ${JSON.stringify(recentTransactions)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar conselhos no momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Falha ao contatar o consultor IA.");
  }
};