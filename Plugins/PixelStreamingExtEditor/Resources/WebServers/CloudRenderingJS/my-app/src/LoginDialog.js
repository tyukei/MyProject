import React from 'react';
import ReactModal from 'react-modal';
import axios from 'axios'
import { CameraMode } from 'cloudrendering'
import { getSignallingServerUrls } from './ServerOptions';
import './LoginDialog.css';

const KEY_METACOMM_ID = 'MetaCommId-Key000'

class LoginDialog extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      metaCommId: this.createUuid(),
      cameraModeList: [
        CameraMode.ThirdPerson,
        CameraMode.Fixed,
        CameraMode.ThirdPerson_AI,
        CameraMode.Fixed_AI,
      ],
      cameraMode: CameraMode.ThirdPerson,
      sceneIdListFixed: [],
      sceneIdListFixedAI: [],
      sceneId: undefined,
      serverOptions: []
    };
  }

  componentDidMount() {
  }

  createUuid(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(a) {
      let r = (new Date().getTime() + Math.random() * 16)%16 | 0, v = (a === 'x') ? r : ((r & 0x03) | 0x08);
      return v.toString(16);
    });
  }

  handleSubmit = (event) => {
    event.preventDefault();

    if (this.props.onClose) {
      this.props.onClose('' + this.state.metaCommId, this.state.cameraMode, this.state.sceneId, this.state.serverOptions);
    }
    return true;
  }

  handleChangeMetaCommId = (event) => {
    this.setState(() => ({
      metaCommId: event.target.value
    }));
  }

  handleChangeSceneId = (event) => {
    this.setState(() => ({
      sceneId: event.target.value
    }));
  }

  handleChangeCameraMode = (event) => {
    this.setState(() => ({
      cameraMode: event.target.value,
      sceneId: this.getSelectSceneId(event.target.value),
      visible: (event.target.value === CameraMode.Fixed || event.target.value === CameraMode.Fixed_AI)
    }));
  }

  getSelectSceneId(cameraMode) {
    if (cameraMode === CameraMode.Fixed) {
      if (this.state.sceneIdListFixed.length > 0) {
        return this.state.sceneIdListFixed[0];
      }
    } else if (cameraMode === CameraMode.Fixed_AI) {
      if (this.state.sceneIdListFixedAI.length > 0) {
        return this.state.sceneIdListFixedAI[0];
      }
    }
    return undefined;
  }

  async updateSceneList() {
    let options = getSignallingServerUrls();

    try {
      let noneScenes = [];
      let fixedScenes = [];
      let serverOptions = [];

      for (let option of options) {
        const res = await axios.get(option.apiUrl);
        let allScenes = [];
        if (res.data.scenes && res.data.scenes.length > 0) {
          for (let scene of res.data.scenes) {
            if (scene.cameraMode === CameraMode.Fixed) {
              fixedScenes.push(scene.sceneId);
            } else if (scene.cameraMode === CameraMode.Fixed_AI) {
              noneScenes.push(scene.sceneId);
            }
            allScenes.push(scene.sceneId);
          }
          serverOptions.push({
            uri: option.wsUrl,
            sceneIds: allScenes
          });
        }
      }

      if (serverOptions.length <= 0) {
        console.log('The streamer is not connected to the signaling server.');
      }

      this.setState(() => ({
        cameraMode: CameraMode.ThirdPerson,
        sceneIdListFixed: fixedScenes,
        sceneIdListFixedAI: noneScenes,
        serverOptions: serverOptions
      }));
    } catch (error) {
      console.log('ERROR.', error);
      this.setState(() => ({
        cameraMode: CameraMode.ThirdPerson,
        sceneIdListFixed: [],
        sceneIdListFixedAI: [],
        serverOptions: []
      }));
    }
  }

  handleMetaCommIdSave() {
    localStorage.setItem(KEY_METACOMM_ID, this.state.metaCommId);
  }

  handleMetaCommIdLoad() {
    const id = localStorage.getItem(KEY_METACOMM_ID);
    this.setState(() => ({ metaCommId: id }));
  }

  handleOpen = () => {
    this.updateSceneList();
  }

  handleClose = () => {
  }

  render() {
    return (<div>
      <ReactModal
        isOpen={this.props.isOpen}
        onAfterOpen={this.handleOpen}
        onRequestClose={this.handleClose}
        className="Modal"
        overlayClassName="Overlay"
        contentLabel="LoginDialog"
        ariaHideApp={false}>
        <form onSubmit={this.handleSubmit}>
          <div className="login-dialog-container">
            <h1>ログイン</h1>
            <table className="login-dialog-table">
              <tbody>
                <tr>
                  <td>
                    <label className="login-dialog-label">メタコミ ID</label>
                  </td>
                  <td>
                    <input className="login-dialog-textbox" value={this.state.metaCommId} onChange={this.handleChangeMetaCommId.bind(this)} />
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td>
                    <div className='login-dialog-metacommid-label'>
                      <button type="button" className="metacommid-btn metacommid-btn-save" onClick={this.handleMetaCommIdSave.bind(this)}>SAVE</button>
                      <button type="button" className="metacommid-btn metacommid-btn-load" onClick={this.handleMetaCommIdLoad.bind(this)}>LOAD</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <label className="login-dialog-label">参加カメラモード</label>
                  </td>
                  <td>
                    <select className="login-dialog-select" id="cameraMode" onChange={this.handleChangeCameraMode.bind(this)}>
                      {this.state.cameraModeList.map((cameraMode) => {
                        return <option key={cameraMode} value={cameraMode}>{cameraMode}</option>;
                      })}
                    </select>
                  </td>
                </tr>
                {this.state.cameraMode === CameraMode.Fixed && <tr>
                  <td>
                    <label className="login-dialog-label">参加フィールド</label>
                  </td>
                  <td>
                    <select className="login-dialog-select" id="sceneId" onChange={this.handleChangeSceneId.bind(this)}>
                      {this.state.sceneIdListFixed.map((sceneId) => {
                        return <option key={sceneId} value={sceneId}>{sceneId}</option>;
                      })}
                    </select>
                  </td>
                </tr>}
                {this.state.cameraMode === CameraMode.Fixed_AI && <tr>
                  <td>
                    <label className="login-dialog-label">参加フィールド</label>
                  </td>
                  <td>
                    <select className="login-dialog-select" id="sceneId" onChange={this.handleChangeSceneId.bind(this)}>
                      {this.state.sceneIdListFixedAI.map((sceneId) => {
                        return <option key={sceneId} value={sceneId}>{sceneId}</option>;
                      })}
                    </select>
                  </td>
                </tr>}
                <tr>
                  <td colSpan="2">
                    <input className="login-dialog-btn" type="submit" value="接続" id="connect" disabled={this.state.serverOptions.length === 0} />
                  </td>
                </tr>
                {this.state.serverOptions.length === 0 && <tr>
                  <td className="login-dialog-warning" colSpan="2">
                    カメラ情報の取得ができていません。画面をリロードしてください。
                  </td>
                </tr>}
              </tbody>
            </table>
          </div>
        </form>
      </ReactModal>
    </div>);
  }
}

export default LoginDialog;
