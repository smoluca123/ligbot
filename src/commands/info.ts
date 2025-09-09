import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationCommandType, ApplicationIntegrationType, EmbedBuilder, InteractionContextType, Message } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Information about Lig',
	name: 'info'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		const integrationTypes: ApplicationIntegrationType[] = [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall];
		const contexts: InteractionContextType[] = [
			InteractionContextType.BotDM,
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel
		];
		// registry.registerChatInputCommand((builder) =>
		// 	builder //
		// 		.setName(this.name)
		// 		.setDescription(this.description)
		// );

		// Register Chat Input command
		registry.registerChatInputCommand({
			name: this.name,
			description: this.description,
			integrationTypes,
			contexts
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

		// // Register Chat Input command
		// registry.registerChatInputCommand({
		// 	name: this.name,
		// 	description: this.description,
		// 	integrationTypes,
		// 	contexts
		// });
	}

	public override async chatInputRun(interactionOrMessage: Message | Command.ChatInputCommandInteraction | Command.ContextMenuCommandInteraction) {
		const embed = this.createInfoEmbed();

		if (interactionOrMessage instanceof Message) {
			const sentMessage = interactionOrMessage.channel?.isSendable() && (await interactionOrMessage.channel.send({ embeds: [embed] }));
			if (sentMessage) {
				return sentMessage.edit({ embeds: [embed] });
			}
			return;
		}

		// For interactions, just reply directly
		return interactionOrMessage.reply({ embeds: [embed] });
	}

	private createInfoEmbed() {
		return (
			new EmbedBuilder()
				.setColor('#FF69B4') // Pink color
				.setTitle('🌸 Thông tin về Lig 🌸')
				.setDescription('Xin chào! Mình là Lig, một cô gái xinh đẹp và thú vị! 💕')
				.setThumbnail('https://i.ibb.co/mCCwDSgD/avt4.jpg') // Replace with actual avatar
				.addFields(
					{
						name: '👋 Giới thiệu',
						value: 'Mình là Lig - một cô gái có gu và biết mình muốn gì. Mình thích những cuộc trò chuyện thú vị và ý nghĩa, nhưng không phải ai cũng có thể khiến mình quan tâm! 😉',
						inline: false
					},
					{
						name: '🎨 Sở thích',
						value: '• Vẽ tranh\n• Nghe nhạc trung\n• Đọc sách và xem phim\n• Chụp ảnh selfie\n• Ăn và ngủ, đếm tiền\n• Đi du lịch\n• Ngắm biển - trai đẹp (nhưng vẫn chưa đủ, phải tử tế và dễ thương nữa)',
						inline: true
					},
					{
						name: '🌟 Tính cách',
						value: '• Hướng lung tung\n• Đáng yêu - dễ thương\n• Sáng tạo và nghệ thuật\n• Dễ thương và ngọt ngào (lúc có lúc ko)\n• Mạnh mẽ và độc lập',
						inline: true
					},
					{
						name: '💖 Kiểu người tôi thích',
						value: '• Nhiều tiền, đẹp trai, thích đưa tiền cho Ling\n• Ưu tiên cảm xúc của tôi\n• Quan trọng nhất: Đừng bao giờ cắm sừng tôi (x2) - Cái gì quan trọng nói 2 lần\n• Phải thuộc stk ngân hàng, số dt của tôi, biết tôi thích ăn gì, làm gì, ngủ giờ nào, dậy giờ nào\n• TỬ TẾ, TỬ TẾ, TỬ TẾ',
						inline: false
					},
					{
						name: '💖 Mục tiêu',
						value: 'Trở thành phú bà =)), shopping ko cần nhìn giá, cả ngày chỉ cần nằm trên ghế sofa và chơi game thôiii',
						inline: false
					},
					{
						name: '🌐 Website & Social',
						value: '• **Website:** [lingdethuong.com](https://lingdethuong.com)\n• **Instagram:** [@hantieulig_](https://www.instagram.com/hantieulig_/)\n• **TikTok:** [@lighaydoi](https://www.tiktok.com/@lighaydoi)\n• **Facebook:** [Kiều Linh](https://www.facebook.com/looksobad)',
						inline: true
					},
					{
						name: '💳 Thông tin ngân hàng',
						value: '• **Ngân hàng:** Vietcombank\n• **STK:** 1046881061\n• **Chủ TK:** LUONG KIEU LINH',
						inline: true
					},
					{
						name: '📱 Liên hệ',
						value: 'Nếu muốn kết bạn với mình, hãy gửi tin nhắn nhé! Còn trả lời hay ko là chuyện của mình 😉!',
						inline: false
					}
				)
				// .setImage('https://i.ibb.co/mCCwDSgD/avt4.jpg') // Replace with actual banner
				.setFooter({
					text: '💕 Cảm ơn bạn đã quan tâm đến mình! (Kệ bạn) 💕',
					iconURL: 'https://i.ibb.co/mCCwDSgD/avt4.jpg'
				})
				.setTimestamp()
		);
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
