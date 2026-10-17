import { ref } from 'vue';

const visible = ref(false);
const initialDate = ref('');
const initialText = ref('');

export const openQuickCapture = (options: { date?: string; text?: string } = {}): void => {
    initialDate.value = options.date ?? '';
    initialText.value = options.text ?? '';
    visible.value = true;
};

export const closeQuickCapture = (): void => {
    visible.value = false;
    initialDate.value = '';
    initialText.value = '';
};

export const consumeQuickCaptureSeed = (): { date: string; text: string } => {
    const seed = { date: initialDate.value, text: initialText.value };
    initialDate.value = '';
    initialText.value = '';
    return seed;
};

export const useQuickCapture = () => ({
    visible,
    openQuickCapture,
    closeQuickCapture,
    consumeQuickCaptureSeed,
});
