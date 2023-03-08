import { Context, Schema, Session } from 'koishi'
import { Configuration, OpenAIApi } from 'openai';
import {} from 'koishi-plugin-puppeteer'

export const name = 'openai-chatgpt'

export interface Config {
  apiKey: string
  apiAddress: string
  model: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  stop: string[]
  errorMessage: string
  triggerWord: string
  pictureMode: boolean
}

export const Config: Schema<Config> = Schema.object({
  apiKey: Schema.string().required().description("OpenAI API Key: https://platform.openai.com/account/api-keys"),
  apiAddress: Schema.string().required().default("https://api.openai.com/v1").description("API 请求地址。"),
  triggerWord: Schema.string().default("chat").description("触发机器人回答的关键词。"),
  model: Schema.union(['gpt-3.5-turbo', 'gpt-3.5-turbo-0301']).default('gpt-3.5-turbo'),
  temperature: Schema.number().default(1).description("温度，更高的值意味着模型将承担更多的风险。对于更有创造性的应用，可以尝试 0.9，而对于有明确答案的应用，可以尝试 0（argmax 采样）。"),
  maxTokens: Schema.number().default(100).description("生成的最大令牌数。"),
  topP: Schema.number().default(1),
  frequencyPenalty: Schema.number().default(0).description('数值在 -2.0 和 2.0 之间。正值是根据到目前为止它们在文本中的现有频率来惩罚新的标记，减少模型逐字逐句地重复同一行的可能性。'),
  presencePenalty: Schema.number().default(0).description('数值在 -2.0 和 2.0 之间。正值根据新标记在文本中的现有频率对其进行惩罚，减少了模型（model）逐字重复同一行的可能性。'),
  stop: Schema.array(Schema.string()).default(null).description('生成的文本将在遇到任何一个停止标记时停止。'),
  errorMessage: Schema.string().default("回答出错了，请联系管理员。").description("回答出错时的提示信息。"),
  pictureMode: Schema.boolean().default(false).description("开启图片模式。")
})

export async function apply(ctx: Context, config: Config) {
  const configuration = new Configuration({
    apiKey: config.apiKey,
    basePath: config.apiAddress,
  });
  
  const openai = new OpenAIApi(configuration);

  //console.log(openai);
  //const response = await openai.listEngines();
  //console.log(response.data);

  ctx.before('send', async (session) => {
    if (config.pictureMode === true) {
      const html = `<html style="width: 200px; height: 0px; background: 'white'; word-wrap: break-word; white-space: pre-wrap;">
        <div> ${ session.content.replace(/\n/g, '<br>').replace(/<\/*template>/g, '') } </div>
      </html>`;
      //console.log(ctx.puppeteer);
      session.content = await ctx.puppeteer.render(html);
    }
  })

  ctx.command(config.triggerWord + ' <message:text>').action(async ({ session }, message) => {
    const q = message;
    session.send("查询中，请耐心等待...");
    try {
      const completion = await openai.createChatCompletion({
        model: config.model,
        messages: [{ "role": "user", 'content': q }],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP,
        frequency_penalty: config.frequencyPenalty,
        presence_penalty: config.presencePenalty,
        stop: config.stop,
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
      return config.errorMessage;
    }
  })
}