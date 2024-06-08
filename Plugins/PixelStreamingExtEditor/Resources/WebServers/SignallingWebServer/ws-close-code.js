module.exports = {
  /**
   * カメラ切り替え時の close コードを定義します。
   */
  WS_CODE_CAMERA_CHANGE : 3001,
 
  /**
    * UE アプリが接続されていない場合の close コードを定義します。
    */
  WS_CODE_NOT_FOUND_STREAMER : 3002,
 
  /**
    * WS 側でのエラーが発生した場合の close コードを定義します。
    */
  WS_CODE_ABNORMAL_CLOSE : 3006,

  /**
   * SFU 側でのエラーが発生した場合の close コードを定義します。
   */
  WS_CODE_SFU_ABNORMAL_CLOSE : 3007,

  /**
   * プラグイン側でのエラーが発生した場合の close コードを定義します。
   */
  WS_CODE_PLUGIN_ABNORMAL_CLOSE : 3008,

  /**
   * JWT 検証でエラーが発生した場合の close コードを定義します。
   */
  WS_CODE_JWT_ERROR : 3009,

  /**
   * 既に存在する PlayerId の場合の close コードを定義します。
   */
  WS_CODE_ALREAD_EXIST_PLAYER : 3016,

  /**
   * Streamer から Kick された場合の close コードを定義します。
   */
  WS_CODE_KICK_BY_STREAMER: 3017,

  /**
   * プレイヤーに空きがない場合の close コードを定義します。
   */
  WS_CODE_PLAYER_IS_FULL : 3018,

  /**
   * メタコミIDが重複した場合の close コードを定義します。
   */
  WS_CODE_DUPLICATE_METACOMM_ID : 3019,

  /**
   * Streamer が切断された場合の close コードを定義します。
   */
  WS_CODE_STREAMER_DISCONNECT : 3020,
};