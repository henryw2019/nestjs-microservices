import { Injectable, BadRequestException, Logger } from '@nestjs/common';

@Injectable()
export class KycService {
    private readonly logger = new Logger(KycService.name);

    // 模拟黑名单关键词
    private readonly blacklistedKeywords = [
        // Fraud & Illegal Activity
        'scammer',
        'hacker',
        'terrorist',
        'laundering',
        'fraud',
        'phishing',
        'ponzi',
        'casino',
        'lottery',
        'drug',
        'weapon',
        'malware',
        'virus',
        'spam',

        // System & Impersonation
        'admin',
        'root',
        'system',
        'support',
        'moderator',
        'staff',
        'official',
        'security',
        'bot',
        'noreply',
        'webmaster',
        'sysadmin',
        'superuser',

        // Technical / Reserved
        'null',
        'undefined',
        'void',
        'test',
        'unknown',
    ];

    /**
     * 扫描用户资料是否包含敏感词
     * @param profile 需要检查的字段集合
     */
    async validateProfile(profile: {
        firstName?: string;
        lastName?: string;
        email?: string;
        [key: string]: unknown;
    }): Promise<void> {
        // 模拟 500ms - 1500ms 的随机延迟
        const delay = Math.floor(Math.random() * 1000) + 500;
        await new Promise(resolve => setTimeout(resolve, delay));

        const valuesToCheck = [profile.firstName, profile.lastName, profile.email].filter(
            Boolean,
        ) as string[];

        for (const value of valuesToCheck) {
            for (const keyword of this.blacklistedKeywords) {
                // 使用单词边界 (\b) 进行精确匹配，防止 "badminton" 误报 "admin"
                // 同时也支持 "fraud wong" 这种包含独立单词的情况
                const regex = new RegExp(`\\b${keyword}\\b`, 'i');

                if (regex.test(value)) {
                    this.logger.warn(
                        `KYC Alert: Blocked operation due to keyword "${keyword}" in value "${value}"`,
                    );
                    throw new BadRequestException(
                        `KYC Check Failed: Profile contains restricted content.`,
                    );
                }
            }
        }
    }
}
