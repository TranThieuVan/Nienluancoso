<template>
    <input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" type="text"
        :placeholder="placeholder" class="w-2/3 p-2 border rounded shadow-md" />
</template>

<script setup>
defineProps({
    modelValue: String,
    placeholder: {
        type: String,
        default: "Nhập từ khóa tìm kiếm..."
    }
});

defineEmits(["update:modelValue"]);
</script>

<style scoped>
input {
    min-width: 200px;
}
</style>