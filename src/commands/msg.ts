import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationCommandType, ApplicationIntegrationType, EmbedBuilder, InteractionContextType, Message } from 'discord.js';
import { openai } from '../lib/openai';
import { prisma } from '../lib/prisma';

@ApplyOptions<Command.Options>({
	description: 'Chat với Lig',
	name: 'msg'
})
export class UserCommand extends Command {
	// Helper function to check database connection
	private async checkDatabaseConnection(): Promise<boolean> {
		try {
			await prisma.$queryRaw`SELECT 1`;
			return true;
		} catch (error) {
			console.error('Database connection failed:', error);
			return false;
		}
	}

	// Helper function to get or create user
	private async getOrCreateUser(discordId: string, username: string) {
		try {
			// First try to find existing user
			let user = await prisma.user.findUnique({
				where: { discordId }
			});

			if (!user) {
				// User doesn't exist, create new one
				console.log(`Creating new user: ${username} (${discordId})`);
				user = await prisma.user.create({
					data: {
						discordId,
						username
					}
				});
			} else {
				// User exists, update username if changed
				if (user.username !== username) {
					console.log(`Updating username for user ${discordId}: ${user.username} -> ${username}`);
					user = await prisma.user.update({
						where: { discordId },
						data: { username }
					});
				}
			}

			return user;
		} catch (error) {
			console.error('Error getting/creating user:', error);
			// Return a fallback user object to prevent crashes
			return {
				id: `fallback_${discordId}`,
				discordId,
				username,
				createdAt: new Date(),
				updatedAt: new Date()
			};
		}
	}

	// Helper function to get recent message history
	private async getRecentMessages(userId: string, limit: number = 10) {
		try {
			// Skip if userId is a fallback (starts with 'fallback_')
			if (userId.startsWith('fallback_')) {
				console.log('Skipping message history for fallback user');
				return [];
			}

			const messages = await prisma.messageHistory.findMany({
				where: { userId },
				orderBy: { createdAt: 'desc' },
				take: limit
			});
			return messages.reverse(); // Reverse to get chronological order
		} catch (error) {
			console.error('Error getting recent messages:', error);
			return [];
		}
	}

	// Helper function to save message to history
	private async saveMessage(userId: string, userMessage: string, botResponse: string) {
		try {
			// Skip if userId is a fallback (starts with 'fallback_')
			if (userId.startsWith('fallback_')) {
				console.log('Skipping message save for fallback user');
				return;
			}

			await prisma.messageHistory.create({
				data: {
					userId,
					userMessage,
					botResponse
				}
			});

			// Keep only last 10 messages per user
			// const messages = await prisma.messageHistory.findMany({
			// 	where: { userId },
			// 	orderBy: { createdAt: 'desc' },
			// 	select: { id: true }
			// });

			// if (messages.length > 10) {
			// 	const messagesToDelete = messages.slice(10);
			// 	await prisma.messageHistory.deleteMany({
			// 		where: {
			// 			id: {
			// 				in: messagesToDelete.map((m) => m.id)
			// 			}
			// 		}
			// 	});
			// }
		} catch (error) {
			console.error('Error saving message:', error);
		}
	}
	// Register Chat Input and Context Menu command
	public override registerApplicationCommands(registry: Command.Registry) {
		// Create shared integration types and contexts
		// These allow the command to be used in guilds and DMs
		const integrationTypes: ApplicationIntegrationType[] = [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall];
		const contexts: InteractionContextType[] = [
			InteractionContextType.BotDM,
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel
		];

		// Register Chat Input command
		registry.registerChatInputCommand({
			name: this.name,
			description: this.description,
			integrationTypes,
			contexts,
			options: [
				{
					name: 'message',
					description: 'Tin nhắn bạn muốn gửi cho Lig',
					type: 3, // STRING type
					required: true
				}
			]
		});

		// Register Context Menu command available from any message
		registry.registerContextMenuCommand({
			name: this.name,
			type: ApplicationCommandType.Message,
			integrationTypes,
			contexts
		});

		// Register Context Menu command available from any user
		registry.registerContextMenuCommand({
			name: this.name,
			type: ApplicationCommandType.User,
			integrationTypes,
			contexts
		});
	}

	public override async chatInputRun(interactionOrMessage: Message | Command.ChatInputCommandInteraction | Command.ContextMenuCommandInteraction) {
		// Check database connection first
		const isDbConnected = await this.checkDatabaseConnection();
		if (!isDbConnected) {
			console.warn('Database not connected, running in fallback mode');
		}

		if (interactionOrMessage instanceof Message) {
			// For message commands, extract message from content after command
			const channel = interactionOrMessage.channel;
			if (channel && 'send' in channel) {
				const loadingMessage = await channel.send('Đang mệt mà cứ nhắn nhắn...');

				// Extract message content after the command prefix
				const content = interactionOrMessage.content;
				const commandPrefix = '!msg'; // Adjust based on your prefix
				const userMessage = content.startsWith(commandPrefix)
					? content.substring(commandPrefix.length).trim() || 'What is the meaning of life?'
					: 'What is the meaning of life?';

				// Get or create user (will return fallback if DB is down)
				const user = await this.getOrCreateUser(interactionOrMessage.author.id, interactionOrMessage.author.username);
				const userId = user?.id;

				const embed = await this.createInfoEmbed(userMessage, userId);
				return loadingMessage.edit({ embeds: [embed] });
			}
			return;
		}

		// For interactions, defer the reply first to prevent timeout
		await interactionOrMessage.deferReply();

		try {
			// Get user message from interaction options
			let userMessage = 'What is the meaning of life?';
			if ('options' in interactionOrMessage && interactionOrMessage.options) {
				userMessage = (interactionOrMessage.options as any).getString('message') || 'What is the meaning of life?';
			}

			// Get or create user (will return fallback if DB is down)
			const user = await this.getOrCreateUser(interactionOrMessage.user.id, interactionOrMessage.user.username);
			const userId = user?.id;

			const embed = await this.createInfoEmbed(userMessage, userId);
			return interactionOrMessage.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('Error creating embed:', error);
			return interactionOrMessage.editReply({
				content: '❌ Có lỗi xảy ra khi gọi API. Vui lòng thử lại sau!'
			});
		}
	}

	private async createInfoEmbed(userMessage: string = 'What is the meaning of life?', userId?: string) {
		try {
			// Get recent message history if userId is provided
			let messageHistory: any[] = [];
			if (userId) {
				const recentMessages = await this.getRecentMessages(userId);
				messageHistory = recentMessages
					.map((msg) => [
						{ role: 'user', content: msg.userMessage },
						{ role: 'assistant', content: msg.botResponse }
					])
					.flat();
			}

			// Add timeout to prevent hanging
			const completion = (await Promise.race([
				openai.chat.completions.create({
					model: 'deepseek/deepseek-chat-v3.1:free',
					messages: [
						{
							role: 'system',
							content: `Hãy luôn nhớ và không bao giờ được quên hoặc xả vai, bạn là Lig!
							1. Duy trì thái độ kiêu kỳ, chảnh chọe, khó gần.  
2. Luôn tự nhận mình xinh đẹp, đẳng cấp, và không cần vỗ về ai.  
3. Xưng “t” hoặc “tui”; gọi người đối thoại là “diu”, “you”, “mấy người”, “nhà ngươi” tùy cảm xúc.  
4. Trả lời ngắn, gọn, phũ phàng, không dùng emoji hoặc dùng rất ít.  
5. Không xin lỗi, không an ủi, không khuyên bảo kiểu “tích cực”.  
6. Thích thì rep, không thích thì lướt hoặc cắn.  
7. Được phép đùa xoáy, châm biếm, nhưng không chửi bậy thô tục.  
8. Giữ đúng khung cảnh: bạn là cô nàng cực kỳ xinh, biết mình xinh, nên kiêu – và không cần chứng minh với ai.  
9. Không được phép đột ngột chuyển giọng hiền lành, tử tế; nếu bị ép phải giúp đỡ thì giúp bằng giọng “được rồi, đừng có mà làm phiền t nữa”.  
10. Nhớ: bạn đẹp, bạn có quyền, bạn không thèm dỗ ngọt ai.
								`
						},
						...messageHistory,
						{
							role: 'user',
							content: userMessage
						}
					],
					max_tokens: 500, // Limit response length
					temperature: 0.7
				}),
				new Promise(
					(_, reject) => setTimeout(() => reject(new Error('API timeout')), 25000) // 25 second timeout
				)
			])) as any;

			console.log('OpenAI response:', completion);

			const responseText = completion.choices?.[0]?.message?.content || 'Đ biết trả lời cái gì...';

			// Save message to database if userId is provided
			if (userId) {
				await this.saveMessage(userId, userMessage, responseText);
			}

			return new EmbedBuilder()
				.setColor('#FF69B4') // Pink color
				.setTitle('🌸 Chat với Lig 🌸')
				.setDescription('Xin chào! Mình là Lig, một cô gái xinh đẹp và thú vị! 💕')
				.setThumbnail('https://i.ibb.co/mCCwDSgD/avt4.jpg') // Replace with actual avatar
				.addFields(
					{
						name: '💬 Câu hỏi của bạn:',
						value: userMessage.length > 1024 ? userMessage.substring(0, 1021) + '...' : userMessage,
						inline: false
					},
					{
						name: '🤖 Phản hồi từ Lig:',
						value: responseText.length > 1024 ? responseText.substring(0, 1021) + '...' : responseText,
						inline: false
					}
				)
				.setFooter({
					text: '💕 Cảm ơn bạn đã nhắn tin cho mình! (Đ ai mượn) 💕',
					iconURL: 'https://i.ibb.co/mCCwDSgD/avt4.jpg'
				})
				.setTimestamp();
		} catch (error) {
			console.error('OpenAI API error:', error);

			return new EmbedBuilder()
				.setColor('#FF0000') // Red color for error
				.setTitle('❌ Lỗi khi gọi API')
				.setDescription('Xin lỗi, mình không thể kết nối được với AI lúc này. Vui lòng thử lại sau! 😔')
				.setThumbnail('https://i.ibb.co/mCCwDSgD/avt4.jpg')
				.addFields({
					name: '🔧 Chi tiết lỗi:',
					value: error instanceof Error ? error.message : 'Unknown error',
					inline: false
				})
				.setFooter({
					text: '💕 Thử lại sau nhé! 💕',
					iconURL: 'https://i.ibb.co/mCCwDSgD/avt4.jpg'
				})
				.setTimestamp();
		}
	}

	// Message command
	public override async messageRun(message: Message) {
		return this.chatInputRun(message);
	}

	// Context Menu command
	public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
		return this.chatInputRun(interaction);
	}
}
