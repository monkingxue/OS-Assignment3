<template>
    <div class="home">
        <side-bar :path.sync="path" :fileData.sync="fileData"></side-bar>
        <field-content :path.sync="path" :fileData.sync="fileData"></field-content>
    </div>
</template>

<script>
    import SideBar from './SideBar.vue'
    import FieldContent from './FieldContent.vue'

    export default {
      data () {
        return {
          path: 'tmp',
          fileData: []
        }
      },
      components: {
        SideBar,
        FieldContent
      }
    }
</script>

<style scoped>
    .home {
        display: flex;
        flex-direction: row;
        min-width: 100vw;
        min-height: 100vh;
    }
</style>
