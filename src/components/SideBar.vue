<template>
    <div class="side-bar">
        <div class="bread-crumb">
            <span class="bc-head">path:</span>
            <el-breadcrumb>
                <el-breadcrumb-item
                        v-for="item in breadCrumb" :key="item">
                    {{item}}
                </el-breadcrumb-item>
            </el-breadcrumb>
        </div>
        <div class="button-group">
            <el-dropdown trigger="click"
                         class="new-btn-wrapper"
                         menu-align="start">
                <el-button :plain="true" type="primary" class="new-btn">New</el-button>
                <el-dropdown-menu slot="dropdown" class="drop-down">
                    <div @click="openDialog('folder')">
                        <el-dropdown-item>New Folder</el-dropdown-item>
                    </div>
                    <div @click="openDialog('file')">
                        <el-dropdown-item>New File</el-dropdown-item>
                    </div>
                </el-dropdown-menu>
            </el-dropdown>
            <el-button :plain="true" type="danger"
                       class="format-btn" @click="formatDialog=true">Format
            </el-button>
        </div>

        <el-dialog :title="title"
                   :visible.sync="dialogVisible"
                   :modal-append-to-body="false"
                   :lock-scroll="true">
            <el-form :model="folder" class="form" v-if="dialogType == 'folder'">
                <el-form-item label="Folder Name" :label-width="formLabelWidth">
                    <el-input v-model="folder.name" auto-complete="off"></el-input>
                </el-form-item>
            </el-form>
            <el-form :model="file" class="form" v-else>
                <el-form-item label="File Name" :label-width="formLabelWidth">
                    <el-input v-model="file.name" auto-complete="off"></el-input>
                </el-form-item>
                <el-form-item label="File Type" :label-width="formLabelWidth">
                    <el-input v-model="file.type" auto-complete="off"></el-input>
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
                <el-button @click="dialogVisible = false">cancel</el-button>
                <el-button type="primary" @click="createNode">ok</el-button>
            </div>
        </el-dialog>

        <el-dialog
                title="prompt"
                :modal-append-to-body="false"
                :visible.sync="formatDialog"
                size="tiny">
            <span>Confirm the formatting？</span>
            <span slot="footer" class="dialog-footer">
                <el-button @click="formatDialog = false">Cancel</el-button>
                <el-button type="danger" @click="formatNode">Ok</el-button>
            </span>
        </el-dialog>
    </div>
</template>

<script>
  import { createFolder, createFile, getAllFile, formatFolder } from '../service'

  export default {
    data () {
      return {
        dialogType: 'folder',
        dialogVisible: false,
        formatDialog: false,
        folder: {
          name: ''
        },
        file: {
          name: '',
          type: '',
          content: ''
        },
        formLabelWidth: '100px'
      }
    },
    props: {
      path: String
    },
    computed: {
      title () {
        const str = this.dialogType
        return `New ${str.charAt(0).toUpperCase() + str.slice(1)}`
      },
      breadCrumb () {
        let bc = this.path.split('/')
        bc[0] = '~'
        return bc
      }
    },
    methods: {
      openDialog (type) {
        this.dialogVisible = true
        this.dialogType = type
      },
      createNode () {
        const response = this.dialogType === 'folder'
          ? this.newFolder() : this.newFile()
        response
          .then(_ => {
            this.$message.success(`Successfully created`)
            this.dialogVisible = false
            return getAllFile(this.path)
          })
          .then(data => {
            this.$emit('update:fileData', data)
            this.file = {}
            this.folder = {}
          })
          .catch(err => this.$message.error(`Error, ${err}`))
      },
      newFolder () {
        const {name} = this.folder
        if (name) {
          return createFolder(this.path, name)
        }
      },
      newFile () {
        const {name, type, content} = this.file
        if (name || type) {
          return createFile(this.path, `${name}.${type}`, content)
        }
      },
      formatNode () {
        formatFolder()
          .then(_ => {
            this.$message.success(`Successfully formated`)
            this.formatDialog = false
            this.$emit('update:path', 'tmp')
            return getAllFile('tmp')
          })
          .then(data => {
            this.$emit('update:fileData', data)
          })
          .catch(err => this.$message.error(`${err}`))
      }
    }
  }
</script>

<style scoped>
    .side-bar {
        position: fixed;
        width: 234px;
        min-height: 100vh;
        background-color: #eef1f6;
        text-align: left;
    }

    .bread-crumb {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-left: 20px;
        margin-top: 50px;
    }

    .bc-head {
        color: #48576a;
        margin-right: 5px;
    }

    .button-group {
        display: flex;
        flex-direction: row;
        padding: 28px 20px;
        justify-content: space-between;
    }

    .new-btn {
        width: 80px;
    }

    .format-btn {
        width: 80px;
    }

    .drop-down {
        width: 120px;
        font-size: 13px;
    }

    .form {
        font-size: 16px;
    }

    .avatar-uploader {
        margin-top: 50px;
        margin-left: 20px;
    }

    .avatar-uploader .avatar-uploader-icon {
        border: 1px dashed #d9d9d9;
        border-radius: 6px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
    }

    .avatar-uploader .avatar-uploader-icon:hover {
        border-color: #20a0ff;
    }

    .avatar-uploader-icon {
        font-size: 28px;
        color: #8c939d;
        width: 178px;
        height: 178px;
        line-height: 178px;
        text-align: center;
    }
</style>
