<template>
    <div class="content">
        <nav role="navigation" class="title-bar">
            <div class="divide-part">
                <i v-if="this.path !== 'tmp'" class="el-icon-arrow-left go-back" @click="goBack()"></i>
                <span v-else class="blank"></span>
                <span class="name-head">Name</span>
            </div>
            <div class="divide-part">
                <span class="status-head">Access</span>
                <span class="size-head">Size</span>
                <span class="modified-head">Modified</span>
            </div>
        </nav>
        <transition-group name="file-list" class="file-content">
            <field-item v-for="item in this.files"
                        :key="item.name" :content="item"
                        :changePath="changePath" :changeFile="changeFile"
                        :path.sync="path" :fileData.sync="fileData">
            </field-item>
        </transition-group>

    </div>
</template>

<script>
  import FieldItem from './FieldItem.vue'
  import { getAllFile } from '../service'

  export default {
    props: {
      path: String,
      fileData: Array
    },
    created () {
      this.getFileData(this.path)
    },
    computed: {
      files () {
        return this.fileData
      }
    },
    components: {
      FieldItem
    },
    methods: {
      changePath (path) {
        this.$emit('update:path', path)
      },
      changeFile (data) {
        this.$emit('update:fileData', data)
      },
      goBack () {
        const path = this.path.split('/').slice(0, -1).join('/')
        this.changePath(path)
        this.getFileData(path)
      },
      getFileData (path) {
        getAllFile(path)
          .then(data => this.changeFile(data))
      }
    }
  }
</script>

<style scoped>
    .content {
        display: flex;
        flex-direction: column;
        height: 100vh;
        flex: 1;
        text-align: left;
        overflow: scroll;
        margin-left: 234px;
    }

    .title-bar {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        border-bottom: 1px solid #F0F0F0;

        height: 52px;
        padding: 0 62px 0 20px;
    }

    .go-back {
        cursor: pointer;
    }

    .divide-part {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .name-head {
        margin-left: 32px;
    }

    .blank {
        width: 16px;
    }

    .status-head {
        color: #C7C7C7;
        min-width: 45px;
    }

    .size-head {
        min-width: 50px;
        margin: 0 30px;
    }

    .modified-head {
        min-width: 160px;
    }

    .file-list-enter, .file-list-leave-active {
        opacity: 0;
        transform: translateX(45px);
    }

    .file-list-leave-active {
        position: absolute;
    }

    .file-content {
        flex: 1;
        overflow: auto;
    }
</style>
