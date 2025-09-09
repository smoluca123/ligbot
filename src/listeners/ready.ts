import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { StoreRegistryValue } from '@sapphire/pieces';
import { blue, gray, green, magenta, magentaBright, white, yellow } from 'colorette';

const dev = process.env.NODE_ENV !== 'production';

@ApplyOptions<Listener.Options>({ once: true, event: Events.ClientReady })
export class UserEvent extends Listener {
	private readonly style = dev ? yellow : blue;

	public override run() {
		this.printBanner();
		this.printStoreDebugInformation();
		this.setBotStatus();
	}

	private setBotStatus() {
		const { client } = this.container;

		// Danh sách các activities
		const activities = [
			{
				name: '💸 Hết tiền rồi...',
				type: 4 // ActivityType.Custom
			},
			{
				name: '💸 Nghèo rồi...',
				type: 4 // ActivityType.Custom
			},
			{
				name: '💸 Đang hết tiền...',
				type: 4 // ActivityType.Custom
			}
		];

		// Set activity đầu tiên
		client.user?.setPresence({
			activities: [activities[0]]
			// status: 'dnd' // Do Not Disturb status
		});

		// Thay đổi activity mỗi 30 giây (30000ms)
		setInterval(() => {
			const randomActivity = activities[Math.floor(Math.random() * activities.length)];
			client.user?.setPresence({
				activities: [randomActivity]
				// status: 'dnd'
			});
		}, 30000); // 30 giây
	}

	private printBanner() {
		const success = green('+');

		const llc = dev ? magentaBright : white;
		const blc = dev ? magenta : blue;

		const line01 = llc('');
		const line02 = llc('');
		const line03 = llc('');

		// Offset Pad
		const pad = ' '.repeat(7);

		console.log(
			String.raw`
${line01} ${pad}${blc('1.0.0')}
${line02} ${pad}[${success}] Gateway
${line03}${dev ? ` ${pad}${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}` : ''}
		`.trim()
		);
	}

	private printStoreDebugInformation() {
		const { client, logger } = this.container;
		const stores = [...client.stores.values()];
		const last = stores.pop()!;

		for (const store of stores) logger.info(this.styleStore(store, false));
		logger.info(this.styleStore(last, true));
	}

	private styleStore(store: StoreRegistryValue, last: boolean) {
		return gray(`${last ? '└─' : '├─'} Loaded ${this.style(store.size.toString().padEnd(3, ' '))} ${store.name}.`);
	}
}
