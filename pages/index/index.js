// pages/index/index.js
const app = getApp();

const regeneratorRuntime = require("../../libs/runtime.js");

const promise = require("../../utils/promise.js");
const networkp = require("../../utils/networkp.js");
const utils = require("../../utils/util.js");

const checkUserInfoIsEqually = function (options) {
  let success = options.success,
    fail = options.fail,
    cache = options.data;

  let userInfo = app.globalData.userInfo;
  // 用户信息比较
  let b = utils.isObjectValueEqual(cache, userInfo);
  if (success) {
    success(b);
  }
};

const login = promise(wx.login);
const checkSession = promise(wx.checkSession);
const setUserInfoCache = promise(wx.setStorage);
const setUserPasswordCache = promise(wx.setStorage);
const getUserInfo = promise(wx.getUserInfo);
const getUserInfoCache = promise(wx.getStorage);
const pCode2Session = networkp.post;
const pUserInfoPost = networkp.post;
const pCheckUserInfoIsEqually = promise(checkUserInfoIsEqually);
const pGetRandVideoSet = networkp.get;
const pPostComment = networkp.post;
const pGetComment = networkp.get;
const pHandleLiked = networkp.get;
const pHandleCollected = networkp.get;
const pPostDanmaku = networkp.post;

Page({
  /**
   * 页面的初始数据
   */
  data: {
    id: -1,
    videoList: [],
    videoListBackup: [],
    curVideoInfo: {videoId:-1},
    currentVideoComment: {},
    hasChanged: 0,
    dmData: [],
    lineAni: "",
    lineSite: "left",
    commentInputValue: "",
    danmakuInputValue: "",
    lineShiftDistance: wx.getSystemInfoSync().windowWidth / 750,
    statusBarHeight: app.globalData.statusBarHeight,
    popShow: false,
    moreOptionsShow: false,
    // scroll-view的高度
    scrollViewHeight: 0,
    attention: false,
  },

  /***************视频滑动组件监听方法 start************************/
  // 开始/继续播放时触发, e.detail={activeId}
  onPlay(e) {
    let videoId = e.detail.activeId;
    let curVideo = this.data.curVideoInfo;
    if (videoId != curVideo.videoId) {
      let backup = this.data.videoListBackup;
      for (let i = 0; i < backup.length; i++) {
        if (backup[i].videoId == videoId) {
          this.setData({
            curVideoInfo: backup[i],
          });
        }
      }
    }
  }, // 弹幕错位问题 todo

  // 暂停播放时触发, e.detail={activeId}
  onPause(e) {
    //  console.log('pause', e.detail.activeId)
  },

  // 播放到末尾时触发, e.detail={activeId}
  onEnded(e) {},

  // 滑动切换完成时触发
  onChanged: function (e) {
    let videoId = e.detail.activeId;
    let curVideo = this.data.curVideoInfo;
    if (videoId != curVideo.videoId) {
      let backup = this.data.videoListBackup;
      for (let i = 0; i < backup.length; i++) {
        if (backup[i].videoId == videoId) {
          this.setData({
            curVideoInfo: backup[i],
          });
        }
      }
    }
    this.setDM(this.data.curVideoInfo.external.danmaku, false);
    let _data = this.data;
    this.setData({
      hasChanged: _data.hasChanged + 1,
    });
    if (_data.hasChanged == 5) {
      this.getRandVideoSet();
      this.setData({
        hasChanged: 0,
      });
    }
    
  },

  // 视频播放出错时触发, e.detail={activeId}
  onError(e) {
    wx.showToast({
      title: "当前视频出错啦~无法播放噢~",
      icon: "none",
      image: "",
      duration: 2000,
    });
    this.setDM(this.data.curVideoInfo.external.danmaku, false);
  },

  // 播放进度变化时触发，event.detail = {currentTime, duration, activeId}
  onTimeUpdate(e) {},

  /***************视频滑动组件监听方法 end************************/

  // 展示更多操作按钮
  moreOptions: function () {
    this.setData({
      moreOptionsShow: true,
    });
  },

  /***************视频工具组件监听方法 start************************/
  // 处理用户点击喜欢的操作
  onLiked: function () {
    let obj = this.data.curVideoInfo;
    pHandleLiked({
      url: "/u/video/liked",
      data: {
        videoId: obj.videoId,
        id: this.data.id,
        isLiked: obj.isLiked,
      },
    }).then((res) => {
      obj.isLiked = !obj.isLiked;
      this.setData({
        curVideoInfo: obj,
      });
    });
  },

  onCollected: function () {
    let obj = this.data.curVideoInfo;
    pHandleCollected({
      url: "/u/video/collected",
      data: {
        videoId: obj.videoId,
        id: this.data.id,
        isCollected: obj.isCollected,
      },
    }).then((res) => {
      obj.isCollected = !obj.isCollected;
      this.setData({
        curVideoInfo: obj,
      });
    });
  },

  // 展示留言模块
  onComment: function () {
    this.setData({
      commentPopupShow: true,
    });
    this.getComment(1);
  },

  // 加载对应短视频留言
  getComment: function (pages) {
    let _data = this.data;
    pGetComment({
      url: "/u/video/comment",
      data: {
        id: _data.curVideoInfo.videoId,
        pages: pages,
      },
    }).then((res) => {
      if (res.success) {
        this.setData({
          currentVideoComment: res.data,
        });
      }
    });
  },

  onCommentScrollToLower: function () {
    let obj = this.data.currentVideoComment;
    if (obj.current == obj.total) {
      return;
    }
    this.getComment(obj.current + 1);
  },

  onClickUserAvatar: function (e) {
    let userId = e.detail.userId;
    if (userId == app.globalData.id) {
      wx.switchTab({
        url: "/pages/my/my",
      });
    } else {
      wx.navigateTo({
        url: "/pages/user/user?id=" + userId,
      });
    }
  },

  onReport: function (e) {
    let _data = this.data.curVideoInfo;
    let videoId = _data.videoId;
    let videoTitle = _data.title;
    let reporterId = this.data.id;
    wx.navigateTo({
      url:
        "/pages/report/report?video=" +
        videoId +
        "&title=" +
        videoTitle +
        "&id=" +
        reporterId,
    });
  },
  /***************视频工具组件监听方法 end************************/

  confirmSendDanmaku: function (e) {
    let content = e.detail.value;
    pPostDanmaku({
      url: "/u/video/danmaku",
      data: {
        videoId: this.data.curVideoInfo.videoId,
        createdBy: app.globalData.id,
        content: content,
      },
    }).then((res) => {
      this.setData({
        danmakuInputValue: "",
      });
      let _p = { id: Math.round(Math.random() * 400 + 400), content: content };
      let _arr = [];
      _arr.push(_p);
      this.setDM(_arr, true);
    });
  },

  // 处理弹幕位置
  setDM: function (danmakuData, type) {
    if (danmakuData == undefined || danmakuData.length == 0) {
      this.setData({
        dmData: [],
      });
      return;
    }
    // 处理弹幕参数
    let dmArr = [];
    let _b = danmakuData;
    for (let i = 0; i < _b.length; i++) {
      const time = Math.floor(Math.random() * 10);
      const _time = time < 6 ? 6 + i : time + i;
      const top = Math.floor(Math.random() * 80) + 2;
      const _p = {
        id: _b[i].id,
        content: _b[i].content,
        top,
        time: _time,
      };
      dmArr.push(_p);
    }
    if (type) {
      this.setData({
        dmData: this.data.dmData.concat(dmArr),
      });
    } else {
      this.setData({
        dmData: dmArr,
      });
    }
  },

  // 发送留言
  confirmSendComment: function (e) {
    let content = e.detail.value;
    pPostComment({
      url: "/u/video/comment",
      data: {
        videoId: this.data.curVideoInfo.videoId,
        createdBy: app.globalData.id,
        content: content,
      },
    }).then((res) => {
      this.getComment(1);
      this.setData({
        commentInputValue: "",
      });
    });
  },

  // 关闭留言和更多操作弹窗
  onClose: function () {
    this.setData({
      commentPopupShow: false,
      moreOptionsShow: false,
    });
  },

  // 跳转至搜索页
  toSearchPage: function () {
    wx.navigateTo({
      url: "/pages/search/search",
    });
  },

  // 横线左移动画
  leftAnimation: function () {
    if (this.data.lineSite == "right") {
      let animation = wx.createAnimation({
        duration: 500,
        timingFunction: "ease",
        delay: 0,
      });
      animation.translateX(0).step();
      this.setData({
        lineAni: animation.export(),
        lineSite: "left",
        attention: false,
      });
      this.getRandVideoSet();
    }
  },

  // 横线右移动画
  rightAnimation: function () {
    if (this.data.lineSite == "left") {
      let animation = wx.createAnimation({
        duration: 500,
        timingFunction: "ease",
        delay: 0,
      });
      let distance = this.data.lineShiftDistance * 110;
      animation.translateX(distance).step();
      this.setData({
        lineAni: animation.export(),
        lineSite: "right",
        attention: true,
      });
      this.getRandVideoSet();
    }
  },

  // 获取推荐视频
  getRandVideoSet: function () {
    pGetRandVideoSet({
      url: "/u/video/rand",
      data: {
        id: this.data.id,
        attention: this.data.attention,
      },
    }).then((res) => {
      if (res.success) {
        let videos = res.data;
        this.setData({
          videoList: videos.map((item) => ({
            url: item.videoSrc,
            id: item.videoId,
          })),
          videoListBackup: this.data.videoListBackup.concat(videos),
        });
      }
    });
  },

  // 设置用户信息本地缓存
  setUserInfoCache: function () {
    let userInfo = app.globalData.userInfo;
    setUserInfoCache({
      key: "userinfo",
      data: userInfo,
    });
  },

  // 更新用户信息至服务器
  uploadUserInfo: function () {
    let userInfo = app.globalData.userInfo;
    let id = app.globalData.id;
    pUserInfoPost({
      url: "/u/user/info",
      data: {
        avatarUrl: userInfo.avatarUrl,
        city: userInfo.city,
        country: userInfo.country,
        gender: userInfo.gender,
        nickName: userInfo.nickName,
        province: userInfo.province,
        id: id,
      },
    }).then((res) => {
      if (res.code == 500) {
        this.uploadUserInfo();
      }
    });
  },

  // 处理用户信息
  processingUserInfo: function () {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting["scope.userInfo"]) {
          getUserInfo({
            withCredentials: "true",
            lang: "zh_CN",
            timeout: 10000,
          }).then((res) => {
            app.globalData.userInfo = res.userInfo;

            // 比对用户信息是否发生改变
            getUserInfoCache({ key: "userinfo" })
              .then((res) => {
                let userInfoCache = res.data;
                pCheckUserInfoIsEqually({
                  data: userInfoCache,
                })
                  .then((res) => {
                    if (!res) {
                      this.setUserInfoCache();
                      this.uploadUserInfo();
                    }
                  })
                  .catch((err) => {});
              })
              .catch((err) => {
                this.setUserInfoCache();
                this.uploadUserInfo();
              });
          });
        } else {
          let identity = app.globalData.identity;
          if (identity == "1") {
            wx.reLaunch({
              url: "/pages/login/login",
            });
            wx.showToast({
              title: "希望使用您的用户信息~请同意~",
              icon: "none",
              duration: 2000,
              mask: false,
            });
          }
        }
      },
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) { //todo 进入后无法获取id
    if (app.globalData.identity == "1") {
      checkSession()
        .then(() => {
          this.processingUserInfo();
          this.getRandVideoSet();
          this.setData({
            id: app.globalData.id,
          });
        })
        .catch(() => {
          // session过期，需要重新登录
          login()
            .then((res) => {
              let code = res.code;
              pCode2Session({
                url: "/u/user/code2session",
                data: { code: code },
              })
                .then((res) => {
                  // 获取登录口令
                  if (res.success) {
                    let data = res.data;
                    app.globalData.id = data.id;
                    this.setData({
                      id: data.id,
                    });
                    // 设置本地登录口令
                    setUserPasswordCache({
                      key: "auth",
                      data: data.password,
                    });
                    app.globalData.auth = data.password;
                    this.processingUserInfo();
                    this.getRandVideoSet();
                  }
                })
                .catch((err) => {
                  console.log("code 2 session err:" + err);
                });
            })
            .catch((err) => {
              console.log(err);
            });
        });
    }
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          scrollViewHeight: res.windowHeight * 0.65 - 90,
        });
      },
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    this.setData({
      commentPopupShow: false,
      moreOptionsShow: false,
    });
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {},

  onShareAppMessage: function () {
    let cur = this.data.curVideoInfo;
    return {
      title: cur.title,
      path: "/pages/active/active",
      imageUrl: cur.cover,
    };
  },
});