import { Route } from '@/types/route';
import { AxiosRequestConfig } from 'axios';
import { FetchSignedWebSocketIdentityParameterError, PremiumFeatureError } from '@/types';
import { WebcastRoomChatRouteResponse } from '@eulerstream/euler-api-sdk';

// Define local backwards-compatible type (SDK type no longer includes these fields)
// Supports either sessionId + ttTargetIdc OR oauthToken for authentication
export type SendRoomChatFromEulerRouteParams = {
    roomId: string;
    content: string;
    sessionId?: string;
    ttTargetIdc?: string;
    oauthToken?: string;
    options?: AxiosRequestConfig;
};

export class SendRoomChatFromEulerRoute extends Route<SendRoomChatFromEulerRouteParams, WebcastRoomChatRouteResponse> {

    async call(
        {
            roomId,
            content,
            sessionId,
            ttTargetIdc,
            oauthToken,
            options
        }: SendRoomChatFromEulerRouteParams
    ): Promise<WebcastRoomChatRouteResponse> {

        // Resolve OAuth token (either from params or webClient configuration)
        const resolvedOauthToken = oauthToken || this.webClient.configuration.oauthToken;

        // Resolve session credentials (fallback if no OAuth token)
        const resolvedSessionId = sessionId || this.webClient.cookieJar.sessionId;
        const resolvedTtTargetIdc = ttTargetIdc || this.webClient.cookieJar.ttTargetIdc;

        // Validate: if using session auth (and no OAuth), ttTargetIdc is required
        if (!resolvedOauthToken && resolvedSessionId && !resolvedTtTargetIdc) {
            throw new FetchSignedWebSocketIdentityParameterError(
                'ttTargetIdc must be set when sessionId is provided.'
            );
        }

        // Build xOauthToken or xCookieHeader based on available auth method
        // xOauthToken takes precedence over xCookieHeader
        const xOauthToken = resolvedOauthToken || undefined;
        const xCookieHeader = !resolvedOauthToken
            ? this.webClient.cookieJar.buildSessionCookieHeader(resolvedSessionId, resolvedTtTargetIdc)
            : undefined;

        const fetchResponse = await this.webClient.webSigner.premium.sendRoomChat(
            {
                content,
                targetRoomId: roomId,
                // Deprecated fields, but still required by SDK type - headers take precedence
                sessionId: resolvedSessionId || '',
                ttTargetIdc: resolvedTtTargetIdc || undefined,
            },
            xOauthToken,    // xOauthToken
            xCookieHeader,  // xCookieHeader
            options
        );

        switch (fetchResponse.status) {
            case 401:
            case 403:
                throw new PremiumFeatureError(
                    'Sending chats requires an API key & a paid plan, as it uses cloud managed services.',
                    fetchResponse.data.message,
                    JSON.stringify(fetchResponse.data)
                );
            case 200:
                return fetchResponse.data;
            default:
                throw new Error(`Failed to send chat: ${fetchResponse?.data?.message || 'Unknown error'}`);
        }

    }

}
