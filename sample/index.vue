<template>
    <div class="settings-main card">
        <a-input title="标题" @default.capture.left="test">
            <template #default={test}>
            </template>
        </a-input>
    </div>
</template>