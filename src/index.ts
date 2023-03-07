import { Context, Schema, Session } from 'koishi'
import { Configuration, OpenAIApi } from 'openai';

export const name = 'openai-chatgpt'

export interface Config {
  apiKey: string
  apiAddress: string
  model: string
  temperature: number
  max_tokens: number
  top_p: number
  frequency_penalty: number
  presence_penalty: number
  stop: string[]
  errorMessage: string
  triggerWord: string
}

export const Config: Schema<Config> = Schema.object({
  apiKey: Schema.string().required().description("OpenAI API Key: https://platform.openai.com/account/api-keys"),
  apiAddress: Schema.string().required().default("https://api.openai.com/v1").description("API 请求地址"),
  triggerWord: Schema.string().default("chat").description("触发机器人回答的关键词。"),
  model: Schema.union(['gpt-3.5-turbo', 'gpt-3.5-turbo-0301']).default('gpt-3.5-turbo'),
  temperature: Schema.number().default(1).description("温度，更高的值意味着模型将承担更多的风险。对于更有创造性的应用，可以尝试 0.9，而对于有明确答案的应用，可以尝试 0（argmax 采样）。"),
  max_tokens: Schema.number().default(100).description("生成的最大令牌数。"),
  top_p: Schema.number().default(1),
  frequency_penalty: Schema.number().default(0).description('数值在 -2.0 和 2.0 之间。正值是根据到目前为止它们在文本中的现有频率来惩罚新的标记，减少模型逐字逐句地重复同一行的可能性。'),
  presence_penalty: Schema.number().default(0).description('数值在 -2.0 和 2.0 之间。正值根据新标记在文本中的现有频率对其进行惩罚，减少了模型（model）逐字重复同一行的可能性。'),
  stop: Schema.array(Schema.string()).default(null).description('生成的文本将在遇到任何一个停止标记时停止。'),
  errorMessage: Schema.string().default("回答出错了，请联系管理员。").description("回答出错时的提示信息。"),
})

export async function apply(ctx: Context, config: Config) {
  const configuration = new Configuration({
    apiKey: config.apiKey,
    basePath: config.apiAddress
  });
  
  const openai = new OpenAIApi(configuration);

  //console.log(openai);
  //const response = await openai.listEngines();
  //console.log(response.data);

  ctx.command(config.triggerWord + ' <message:text>').action(async ({ session }, message) => {
    const q = message;
    session.send("查询中，请耐心等待...");
    try {
      const completion = await openai.createChatCompletion({
        model: config.model,
        messages: [{"role": "user", 'content': q}]
      });
      //console.log(completion);
      return completion.data.choices[0].message.content;
    } catch (error) {
      if (error.response) {
        console.log(error.response.status);
        console.log(error.response.data);
      } else {
        console.log(error.message);
      }
    }
  })
}