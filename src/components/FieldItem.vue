<template>
    <div class="item-wrapper">
        <div class="field-item" @click="operateNode">
            <div class="divide-part">
                <img :src="fileIcon" alt="..." class="file-icon">
                <span class="file-font">
                {{content.name}}
                <span class="file-type">{{content.name | fileType}}</span>
            </span>
            </div>
            <div class="divide-part file-font">
                <span class="status-icon">{{content.access | fileAccess}}</span>
                <span class="file-size">{{content.size}}kB</span>
                <span class="modi-date">{{content.mtime | createdDate}}</span>
            </div>
        </div>
        <el-button :plain="true" type="danger" icon="delete"
                   size="small" class="del-btn" @click="dialogVisible = true"></el-button>
        <el-dialog
                title="prompt"
                :visible.sync="dialogVisible"
                size="tiny">
            <span>Confirm deletion？</span>
            <span slot="footer" class="dialog-footer">
                <el-button @click="dialogVisible = false">Cancel</el-button>
                <el-button type="danger" @click="deleteNode">Ok</el-button>
            </span>
        </el-dialog>
        <el-dialog :title="filename"
                   :visible.sync="fileVisible"
                   :lock-scroll="true">
            <el-form :model="file" class="form">
                <el-form-item label="File Name" :label-width="formLabelWidth">
                    <el-input v-model="file.name" auto-complete="off"></el-input>
                </el-form-item>
                <el-form-item label="File Content" :label-width="formLabelWidth">
                    <el-input
                            type="textarea"
                            :autosize="{ minRows: 2, maxRows: 4}"
                            v-model="file.content">
                    </el-input>

                </el-form-item>
            </el-form>
            <div slot="footer" class="dialog-footer">
                <el-button @click="fileVisible = false">cancel</el-button>
                <el-button type="primary" @click="modifyFile">modify</el-button>
            </div>
        </el-dialog>
    </div>

</template>

<script>
  import { deleteFile, deleteFolder, getAllFile, getFile, modifyFile } from '../service'
  import ae from '../assets/ae.png'
  import ai from '../assets/ai.png'
  import avi from '../assets/avi.png'
  import css from '../assets/css.png'
  import doc from '../assets/doc.png'
  import exe from '../assets/exe.png'
  import file from '../assets/file.png'
  import folder from '../assets/folder.png'
  import html from '../assets/html.png'
  import jpg from '../assets/jpg.png'
  import js from '../assets/js.png'
  import json from '../assets/json.png'
  import mp3 from '../assets/mp3.png'
  import mp4 from '../assets/mp4.png'
  import pdf from '../assets/pdf.png'
  import png from '../assets/png.png'
  import ppt from '../assets/ppt.png'
  import ps from '../assets/ps.png'
  import psd from '../assets/psd.png'
  import rtf from '../assets/rtf.png'
  import svg from '../assets/svg.png'
  import txt from '../assets/txt.png'
  import xls from '../assets/xls.png'
  import xml from '../assets/xml.png'
  import zip from '../assets/zip.png'

  export default {
    props: {
      path: String,
      fileData: Array,
      content: Object,
      changePath: Function,
      changeFile: Function
    },
    data () {
      return {
        dialogVisible: false,
        fileVisible: false,
        formLabelWidth: '100px',
        file: {
          name: this.content.name,
          oldName: this.content.name,
          content: ''
        }
      }
    },
    computed: {
      filename () {
        return this.content.name
      },
      fileIcon () {
        const hash = {
          ae,
          ai,
          avi,
          css,
          doc,
          exe,
          html,
          jpg,
          js,
          json,
          mp3,
          mp4,
          pdf,
          png,
          ppt,
          ps,
          psd,
          rtf,
          svg,
          txt,
          xls,
          xml,
          zip
        }
        const token = this.content.name.split('.')
        return token.length === 1 ? folder : (hash[token[token.length - 1]] || file)
      }
    },
    methods: {
      deleteNode () {
        let response = this.content.access === 7
          ? this.deleteFolder() : this.deleteFile()
        response
          .then(_ => {
            this.$message.success(`Successfully deleted`)
            this.dialogVisible = false
            return getAllFile(this.path)
          })
          .then(data => this.changeFile(data))
          .catch(err => this.$message.error(`${err}`))
      },
      deleteFile () {
        return deleteFile(this.path, this.content.name)
      },
      deleteFolder () {
        return deleteFolder(`${this.path}/${this.content.name}`)
      },
      operateNode () {
        let res = this.content.access === 7
          ? this.openFolder() : this.openFile()
        res.catch(err => this.$message.error(err))
      },
      openFile () {
        this.fileVisible = true
        return getFile(`${this.path}/${this.content.name}`)
          .then(data => {
            this.file.content = data
          })
      },
      openFolder () {
        const name = this.content.name
        this.changePath(`${this.path}/${name}`)
        return getAllFile(`${this.path}/${name}`)
          .then(data => this.changeFile(data))
      },
      modifyFile () {
        modifyFile(this.path, this.file)
          .then(_ => {
            this.$message.success(`Successfully modified`)
            this.fileVisible = false
            return getAllFile(this.path)
          })
          .then(data => this.changeFile(data))
          .catch(err => this.$message.error(`${err}`))
      }
    },
    filters: {
      createdDate (value) {
        const d = new Date(value)
        const y = d.getFullYear()
        const m = d.getMonth() + 1
        const da = d.getDate()
        const h = d.getHours()
        const mi = d.getMinutes()
        const s = d.getSeconds()
        return `${y}-${m}-${da} ${h}:${mi}:${s}`
      },
      fileType (value) {
        const token = value.split('.')
        const len = token.length
        return len > 1 ? token[len - 1].toUpperCase() : 'DIRECTORY'
      },
      fileAccess (value) {
        const bitfield = {
          7: 'folder',
          6: 'read/write',
          4: 'read',
          2: 'write',
          1: 'execute/search'
        }
        return bitfield[value]
      }
    }
  }
</script>

<style scoped>
    .item-wrapper {
        display: flex;
        flex-direction: row;
        align-items: center;
        transition: all 1s;
    }

    .field-item {
        flex: 1;
        height: 45px;
        padding: 0 20px;
        border-bottom: 1px solid #F0F0F0;

        display: flex;
        flex-direction: row;
        justify-content: space-between;

        cursor: pointer;
    }

    .divide-part {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .file-icon {
        height: 32px;
        width: 32px;
        margin-right: 16px;
    }

    .file-font {
        font-size: 14px;
    }

    .file-type {
        color: #C7C7C7;
        margin-left: 7px;
    }

    .status-icon {
        color: #C7C7C7;
        min-width: 45px;
        text-align: center;
    }

    .file-size {
        text-align: left;
        min-width: 50px;
        margin-left: 30px;
    }

    .modi-date {
        margin-left: 30px;
        min-width: 160px;
    }

    .del-btn {
        height: 32px;
        margin-right: 10px;
    }
</style>
