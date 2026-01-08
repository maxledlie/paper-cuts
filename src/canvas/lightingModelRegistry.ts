import type { LightingModel } from "./lightingModel";

export class LightingModelRegistry {
    private models: Map<string, LightingModel> = new Map();
    private defaultModelId: string | null = null;

    register(
        id: string,
        model: LightingModel,
        isDefault: boolean = false
    ): void {
        this.models.set(id, model);
        if (isDefault || this.defaultModelId === null) {
            this.defaultModelId = id;
        }
    }

    get(id: string): LightingModel | undefined {
        return this.models.get(id);
    }

    getAll(): LightingModel[] {
        return Array.from(this.models.values());
    }

    getDefault(): LightingModel {
        if (this.defaultModelId === null) {
            throw new Error("No default lighting model registered");
        }
        const model = this.models.get(this.defaultModelId);
        if (!model) {
            throw new Error(
                `Default lighting model "${this.defaultModelId}" not found`
            );
        }
        return model;
    }

    getDefaultId(): string {
        if (this.defaultModelId === null) {
            throw new Error("No default lighting model registered");
        }
        return this.defaultModelId;
    }
}

export const lightingModelRegistry = new LightingModelRegistry();
