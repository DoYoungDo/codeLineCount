var hx = require("hbuilderx");
const fs = require("fs")
const path = require("path")

//该方法将在插件激活的时候调用
function activate(context) {
    let disposable = hx.commands.registerCommand('code.line.count', (param) => {
        hx.window.setStatusBarMessage('开始统计...', 5000, 'info');
        codeCount.clear();
        code_line_count(param.fsPath).then(() => {
            hx.window.setStatusBarMessage('统计结束...', 5000, 'info');
            printCount(param.fsPath);
        }).catch(() => {
            hx.window.setStatusBarMessage('统计出错', 5000, 'error');
        });
    });
    //订阅销毁钩子，插件禁用的时候，自动注销该command。
    context.subscriptions.push(disposable);
}
//该方法将在插件禁用的时候调用（目前是在插件卸载的时候触发）
function deactivate() {

}
module.exports = {
    activate,
    deactivate
}

const codeCount = new Map;

async function code_line_count(dir, showMsg = true) {
    if (!fs.statSync(dir).isDirectory()) {
        hx.window.setStatusBarMessage('不是一个目录...', 5000, 'error');
        return
    }

    return new Promise(async (resolve, reject) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            if (!fs.existsSync(filePath)) {
                continue;
            }
            hx.window.setStatusBarMessage(`统计中： ${filePath}`, 100, 'info');
            if (fs.statSync(filePath).isDirectory()) {
                // hx.window.setStatusBarMessage('不是一个目录...', 5000, 'error');
                await code_line_count(filePath, false);
            }
            else {
                const data = fs.readFileSync(filePath);
                let ext = path.extname(filePath);
                ext === "" ? ext = "无后缀" : void 0;

                let count = codeCount.get(ext) || 0;

                for (let i = 0; i < data.length; ++i) {
                    if (data[i] === 10) {
                        count++
                    }
                }
                // 一个换行符等于有两行，所以如果文件中有换行符，最后得加一行
                if (data.length) {
                    count++;
                }
                codeCount.set(ext, count);
            }
        }

        resolve();
    })

}

function printCount(dir) {
    // console.log("codeCount", codeCount);
    hx.window.showFormDialog({
        title: "统计代码行",
        subtitle: `统计目录：${dir}`,
        customButtons: [{
            text: "确定",
            role: "accept"
        }],
        formItems: [{
            type: "list",
            name: "table",
            columnStretches: [1, 1],
            value: 0,
            items: getItems()
        }]
    })

    function getItems() {
        let items = [];

        for (let [key, value] of codeCount) {
            items.push({
                columns: [{
                    label: `${key} 文件`
                }, {
                    label: `${value} 行`
                }]
            })
        }

        items = items.sort((a, b) => b.columns[1].label.toLocaleLowerCase().localeCompare(a.columns[1].label.toLocaleLowerCase()));

        return items;
    }
}