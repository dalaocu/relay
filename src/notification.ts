import axios from "axios";
import { Logger } from "pino";
import { generateChildLogger } from "@walletconnect/logger";

import { Notification } from "./types";
import { HttpService } from "./http";
import { JSONRPC_EVENTS, NOTIFICATION_CONTEXT } from "./constants";
import { RelayJsonRpc } from "@walletconnect/relay-api";

export class NotificationService {
  public context = NOTIFICATION_CONTEXT;

  constructor(public server: HttpService, public logger: Logger) {
    this.server = server;
    this.logger = generateChildLogger(logger, this.context);
    this.initialize();
  }

  public async register(topic: string, webhook: string) {
    await this.server.redis.setNotification({ topic, webhook });
  }

  public async push(topic: string) {
    const notifications = await this.server.redis.getNotification(topic);

    if (notifications && notifications.length) {
      notifications.forEach((notification: Notification) => {
        axios.post(notification.webhook, { topic });
        this.logger.info({
          type: "push",
          webhook: notification.webhook,
          topic,
        });
      });
    }
  }

  // ---------- Private ----------------------------------------------- //

  private initialize(): void {
    this.logger.trace(`Initialized`);
    this.registerEventListeners();
  }

  private async onNewMessage(topic: string, prompt?: boolean) {
    if (prompt) {
      await this.server.notification.push(topic);
    }
  }

  private registerEventListeners() {
    console.log("notifications registerEventListeners")
    this.server.events.on(JSONRPC_EVENTS.publish, async (params: RelayJsonRpc.PublishParams) => {
      console.log("onNewMessage", params.topic);
      this.onNewMessage(params.topic, params.prompt);
    }
    );
  }
}
