import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationIntegrationType, EmbedBuilder, InteractionContextType } from 'discord.js';
import { prisma } from '../lib/prisma';

@ApplyOptions<Command.Options>({
	description: 'Test database connection và thống kê',
	name: 'dbtest'
})
export class UserCommand extends Command {
	// Register Chat Input command
	public override registerApplicationCommands(registry: Command.Registry) {
		const integrationTypes: ApplicationIntegrationType[] = [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall];
		const contexts: InteractionContextType[] = [
			InteractionContextType.BotDM,
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel
		];

		registry.registerChatInputCommand({
			name: this.name,
			description: this.description,
			integrationTypes,
			contexts
		});
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.deferReply();

		try {
			// Test database connection
			const startTime = Date.now();
			await prisma.$queryRaw`SELECT 1`;
			const connectionTime = Date.now() - startTime;

			// Get statistics
			const userCount = await prisma.user.count();
			const messageCount = await prisma.messageHistory.count();
			const recentUsers = await prisma.user.findMany({
				orderBy: { createdAt: 'desc' },
				take: 5,
				select: {
					username: true,
					createdAt: true,
					_count: {
						select: { messages: true }
					}
				}
			});

			const embed = new EmbedBuilder()
				.setColor('#00FF00')
				.setTitle('✅ Database Status')
				.setDescription('Database hoạt động bình thường!')
				.addFields(
					{
						name: '🔗 Kết nối',
						value: `✅ Connected (${connectionTime}ms)`,
						inline: true
					},
					{
						name: '👥 Tổng users',
						value: userCount.toString(),
						inline: true
					},
					{
						name: '💬 Tổng tin nhắn',
						value: messageCount.toString(),
						inline: true
					}
				)
				.setFooter({
					text: '💕 Lig Database Monitor 💕',
					iconURL: 'https://i.ibb.co/mCCwDSgD/avt4.jpg'
				})
				.setTimestamp();

			// Add recent users if any
			if (recentUsers.length > 0) {
				const recentUsersText = recentUsers
					.map((user, index) => `${index + 1}. **${user.username}** (${user._count.messages} tin nhắn)`)
					.join('\n');

				embed.addFields({
					name: '👤 Users gần đây',
					value: recentUsersText,
					inline: false
				});
			}

			return interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('Database test failed:', error);

			const embed = new EmbedBuilder()
				.setColor('#FF0000')
				.setTitle('❌ Database Error')
				.setDescription('Không thể kết nối database!')
				.addFields({
					name: '🔧 Chi tiết lỗi',
					value: error instanceof Error ? error.message : 'Unknown error',
					inline: false
				})
				.setFooter({
					text: '💔 Lig Database Monitor 💔',
					iconURL: 'https://i.ibb.co/mCCwDSgD/avt4.jpg'
				})
				.setTimestamp();

			return interaction.editReply({ embeds: [embed] });
		}
	}
}
