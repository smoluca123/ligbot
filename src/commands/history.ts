import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationIntegrationType, EmbedBuilder, InteractionContextType } from 'discord.js';
import { prisma } from '../lib/prisma';

@ApplyOptions<Command.Options>({
	description: 'Xem lịch sử chat với Lig',
	name: 'history'
})
export class UserCommand extends Command {
	// Register Chat Input command
	public override registerApplicationCommands(registry: Command.Registry) {
		// Create shared integration types and contexts
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
			contexts
		});
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.deferReply();

		// Check database connection first
		try {
			await prisma.$queryRaw`SELECT 1`;
		} catch (error) {
			console.error('Database connection failed:', error);
			return interaction.editReply({
				content: '❌ Không thể kết nối database. Vui lòng thử lại sau!'
			});
		}

		try {
			// Get user from database
			const user = await prisma.user.findUnique({
				where: { discordId: interaction.user.id },
				include: {
					messages: {
						orderBy: { createdAt: 'desc' },
						take: 10
					}
				}
			});

			if (!user) {
				return interaction.editReply({
					content: '🤷‍♀️ Chưa có lịch sử chat nào với Lig cả. Dùng `/msg` để bắt đầu chat nhé!'
				});
			}

			if (user.messages.length === 0) {
				return interaction.editReply({
					content: '🤷‍♀️ Chưa có lịch sử chat nào với Lig cả. Dùng `/msg` để bắt đầu chat nhé!'
				});
			}

			// Create embed with message history
			const embed = new EmbedBuilder()
				.setColor('#FF69B4')
				.setTitle('📚 Lịch sử chat với Lig')
				.setDescription(`Lịch sử ${user.messages.length} tin nhắn gần nhất của ${user.username}`)
				.setThumbnail('https://i.ibb.co/mCCwDSgD/avt4.jpg')
				.setFooter({
					text: '💕 Lig nhớ hết mọi cuộc trò chuyện với bạn! 💕',
					iconURL: 'https://i.ibb.co/mCCwDSgD/avt4.jpg'
				})
				.setTimestamp();

			// Add message history fields (reverse to show chronological order)
			const messages = user.messages.reverse();
			for (let i = 0; i < Math.min(messages.length, 5); i++) {
				const msg = messages[i];
				const truncatedUserMsg = msg.userMessage.length > 100 ? msg.userMessage.substring(0, 97) + '...' : msg.userMessage;
				const truncatedBotMsg = msg.botResponse.length > 100 ? msg.botResponse.substring(0, 97) + '...' : msg.botResponse;

				embed.addFields({
					name: `💬 ${i + 1}. ${truncatedUserMsg}`,
					value: `🤖 ${truncatedBotMsg}`,
					inline: false
				});
			}

			if (messages.length > 5) {
				embed.addFields({
					name: '📝 Ghi chú',
					value: `... và ${messages.length - 5} tin nhắn khác. Lig nhớ hết!`,
					inline: false
				});
			}

			return interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('Error getting message history:', error);
			return interaction.editReply({
				content: '❌ Có lỗi xảy ra khi lấy lịch sử. Vui lòng thử lại sau!'
			});
		}
	}
}
