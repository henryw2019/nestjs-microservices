"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageKey = void 0;
const common_1 = require("@nestjs/common");
const response_constant_1 = require("../constants/response.constant");
const MessageKey = (key, dto) => (0, common_1.applyDecorators)((0, common_1.SetMetadata)(response_constant_1.MESSAGE_KEY_METADATA, key), (0, common_1.SetMetadata)(response_constant_1.MESSAGE_DTO_METADATA, dto));
exports.MessageKey = MessageKey;
//# sourceMappingURL=message.decorator.js.map