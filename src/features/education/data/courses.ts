// src/features/education/data/courses.ts
// ─── Static course data with Cloudflare R2 videos ─────────────────────────────

import type { Course, Lecture } from "../types/course";

/**
 * Cloudflare R2 Public Domain / CDN Base URL.
 * Change this to your custom domain (e.g. https://media.tcbtjaivikkisan.com)
 * or your Cloudflare R2 public URL (e.g. https://pub-xxxxxx.r2.dev).
 */
export const CLOUDFLARE_R2_BASE_URL =
  "https://pub-b30bf5dcb5c54e619a24a0f7d1b2d91e.r2.dev";

export function getCloudflareVideoUrl(r2Key: string): string {
  const cleanBase = CLOUDFLARE_R2_BASE_URL.replace(/\/$/, "");
  const encodedKey = r2Key
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  // If using raw S3 cloudflarestorage endpoint, ensure bucket name is present
  if (
    cleanBase.includes("r2.cloudflarestorage.com") &&
    !cleanBase.includes("lectures-videos")
  ) {
    return `${cleanBase}/lectures-videos/${encodedKey}`;
  }
  return `${cleanBase}/${encodedKey}`;
}

export const COURSES: Course[] = [
  {
    id: "tcbt-organic-farming-101",
    folderId: "gg2nb30e2f74022da4c78b2a2a21827e18611",
    title: "TCBT वृक्षायुर्वेद विज्ञान",
    tagline: "Learn the ancient wisdom of Panchmahabhut-based farming",
    description:
      "A comprehensive course on organic farming techniques rooted in the principles of Panchmahabhut (Five Elements). " +
      "Learn how to grow healthy, chemical-free produce using traditional Indian agricultural wisdom combined with modern sustainable practices. " +
      "This course covers soil health, natural pest management, composting, and certification processes.",
    price: 999,
    thumbnail: require("@/assets/images/tcbt_education.jpg"),
    instructor: "TCBT Jaivik Kisan",
    totalDuration: 1530,
    enrolledCount: 1240,
    language: "Hindi",
    lectures: [
      {
        id: "class-01",
        title: "कक्षा 01: TCBT वृक्षायुर्वेद विज्ञान (01-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 1 - पंचमहाभूत एवं प्राकृतिक कृषि का परिचय।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 1.mp4"),
        order: 1,
        isFree: true,
        workDriveFileId: "gg2nba00233f7b79147a0a991a8d8cc6dbdf7",
      },
      {
        id: "class-02",
        title: "कक्षा 02: TCBT वृक्षायुर्वेद विज्ञान (03-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 2 - भूमि शोधन एवं मिट्टी की उर्वरता वृद्धि।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 2.mp4"),
        order: 2,
        isFree: false,
        workDriveFileId: "geusbe9c426d1eff84dc39fd98f460837792c",
      },
      {
        id: "class-03",
        title: "कक्षा 03: TCBT वृक्षायुर्वेद विज्ञान (04-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 3 - जीवामृत एवं बीजामृत निर्माण तकनीक।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 3.mp4"),
        order: 3,
        isFree: false,
        workDriveFileId: "5h7i5559abf52b469496b9687162d210fe489",
      },
      {
        id: "class-04",
        title: "कक्षा 04: TCBT वृक्षायुर्वेद विज्ञान (05-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 4 - पंचगव्य एवं प्राकृतिक ऊर्जा प्रवाह।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 4.mp4"),
        order: 4,
        isFree: false,
        workDriveFileId: "t2mn224183a5fa59e4e63a4c48e963791d9e0",
      },
      {
        id: "class-05",
        title: "कक्षा 05: TCBT वृक्षायुर्वेद विज्ञान (06-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 5 - जैव विविधता एवं फसल सुरक्षा के नियम।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 5.mp4"),
        order: 5,
        isFree: false,
        workDriveFileId: "qbm0l7f5bdf88feda4357bbd846774e261f30",
      },
      {
        id: "class-06",
        title: "कक्षा 06: TCBT वृक्षायुर्वेद विज्ञान (07-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 6 - प्राकृतिक कीट नियंत्रक फॉर्मूलेशन।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 6.mp4"),
        order: 6,
        isFree: false,
        workDriveFileId: "ph3aq33be26dc038540909dee5ed925b1f5ed",
      },
      {
        id: "class-07",
        title: "कक्षा 07: TCBT वृक्षायुर्वेद विज्ञान (10-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 7 - फंगस एवं बैक्टीरिया जनित रोगों का प्रबंधन।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 7.mp4"),
        order: 7,
        isFree: false,
        workDriveFileId: "fo6923756c9fae9794d30bba076046156c0f5",
      },
      {
        id: "class-08",
        title: "कक्षा 08: TCBT वृक्षायुर्वेद विज्ञान (11-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 8 - भस्म रसायन एवं पोषण प्रबंधन।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 8.mp4"),
        order: 8,
        isFree: false,
        workDriveFileId: "c5q5ad88fae062597449992b4acf474343ed4",
      },
      {
        id: "class-09",
        title: "कक्षा 09: TCBT वृक्षायुर्वेद विज्ञान (12-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 9 - पौधों की रोग प्रतिरोधक क्षमता बढ़ाना।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 9.mp4"),
        order: 9,
        isFree: false,
        workDriveFileId: "c5q5acb47a19757d94491b438bb64c3eef19b",
      },
      {
        id: "class-10",
        title: "कक्षा 10: TCBT वृक्षायुर्वेद विज्ञान (13-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 10 - सूक्ष्म पोषक तत्वों की आपूर्ति।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 10.mp4"),
        order: 10,
        isFree: false,
        workDriveFileId: "44fzxc1728568576849f3a0e5028a16302b3b",
      },
      {
        id: "class-11",
        title: "कक्षा 11: TCBT वृक्षायुर्वेद विज्ञान (14-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 11 - बीज संस्कार एवं अंकुरण तकनीक।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 11.mp4"),
        order: 11,
        isFree: false,
        workDriveFileId: "g2d7a2d527643a5114a4f89f8cfffbd818378",
      },
      {
        id: "class-12",
        title: "कक्षा 12: TCBT वृक्षायुर्वेद विज्ञान (17-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 12 - जल शोधन एवं सिंचाई जल उपचार।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 12.mp4"),
        order: 12,
        isFree: false,
        workDriveFileId: "8u5xt431bac1d293d4bcdbbe229e4dea5edc1",
      },
      {
        id: "class-13",
        title: "कक्षा 13: TCBT वृक्षायुर्वेद विज्ञान (18-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 13 - बहुफसलीय प्रणाली एवं सह-फसली सिद्धांत।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 13.mp4"),
        order: 13,
        isFree: false,
        workDriveFileId: "2cib34ea8be4ba8a84fefad827d2cf004fa63",
      },
      {
        id: "class-14",
        title: "कक्षा 14: TCBT वृक्षायुर्वेद विज्ञान (19-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 14 - खरपतवार नियंत्रण के प्राकृतिक उपाय।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 14.mp4"),
        order: 14,
        isFree: false,
        workDriveFileId: "2cib34127e3360346451f9c02a1787694662b",
      },
      {
        id: "class-15",
        title: "कक्षा 15: TCBT वृक्षायुर्वेद विज्ञान (20-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 15 - प्राकृतिक मल्चिंग एवं नमी संरक्षण।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 15.mp4"),
        order: 15,
        isFree: false,
        workDriveFileId: "bw7sn7148cb9afcde4fbfa1586877dd345742",
      },
      {
        id: "class-16",
        title: "कक्षा 16: TCBT वृक्षायुर्वेद विज्ञान (21-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 16 - प्राकृतिक वृद्धि प्रवर्धक (Growth Promoters)।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 16.mp4"),
        order: 16,
        isFree: false,
        workDriveFileId: "zb7t90f0e3556ac9141e4bfd29fbfcb929fd1",
      },
      {
        id: "class-17",
        title: "कक्षा 17: TCBT वृक्षायुर्वेद विज्ञान (24-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 17 - गोकृपामृत एवं अन्य जैव कल्चर निर्माण।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 17.mp4"),
        order: 17,
        isFree: false,
        workDriveFileId: "wclqdb9aa72dd19c3468e9a362c5ee24bbf37",
      },
      {
        id: "class-18",
        title: "कक्षा 18: TCBT वृक्षायुर्वेद विज्ञान (25-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 18 - फल एवं फूल झड़ने की समस्या का समाधान।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 18.mp4"),
        order: 18,
        isFree: false,
        workDriveFileId: "dilvaf6cc273139354f349b182d668a6963b9",
      },
      {
        id: "class-19",
        title: "कक्षा 19: TCBT वृक्षायुर्वेद विज्ञान (26-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 19 - बागवानी फसलों में वृक्षायुर्वेद का प्रयोग।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 19.mp4"),
        order: 19,
        isFree: false,
        workDriveFileId: "jxy8w5d78a3848a944443b873543c56881c39",
      },
      {
        id: "class-20",
        title: "कक्षा 20: TCBT वृक्षायुर्वेद विज्ञान (27-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 20 - सब्जी उत्पादन में विशेष जैविक रणनीतियां।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 20.mp4"),
        order: 20,
        isFree: false,
        workDriveFileId: "ozm9q4eb673dc80fb4b91ab22cf0b30c0d479",
      },
      {
        id: "class-21",
        title: "कक्षा 21: TCBT वृक्षायुर्वेद विज्ञान (28-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 21 - अनाज व दलहनी फसलों का प्राकृतिक पोषण।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 21.mp4"),
        order: 21,
        isFree: false,
        workDriveFileId: "ti0jq2ab2258c0f324bffb4ec53cffc6470a9",
      },
      {
        id: "class-22",
        title: "कक्षा 22: TCBT वृक्षायुर्वेद विज्ञान (31-08-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 22 - जलवायु परिवर्तन एवं मौसम आधारित खेती।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 22.mp4"),
        order: 22,
        isFree: false,
        workDriveFileId: "uly367abde07482d1482b9facedfeacda3572",
      },
      {
        id: "class-23",
        title: "कक्षा 23: TCBT वृक्षायुर्वेद विज्ञान (01-09-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 23 - प्राकृतिक भंडारण एवं कटाई उपरांत प्रबंधन।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 23.mp4"),
        order: 23,
        isFree: false,
        workDriveFileId: "lyaab3198ebccf7d2429c8b2d0c3e37ced815",
      },
      {
        id: "class-24",
        title: "कक्षा 24: TCBT वृक्षायुर्वेद विज्ञान (02-09-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 24 - स्वदेशी बीज संरक्षण एवं संवर्धन।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 24.mp4"),
        order: 24,
        isFree: false,
        workDriveFileId: "himkrd4024355367a41489f78b68f2283d36d",
      },
      {
        id: "class-25",
        title: "कक्षा 25: TCBT वृक्षायुर्वेद विज्ञान (03-09-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 25 - प्राकृतिक कृषि में पशुपालन का महत्व।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 25.mp4"),
        order: 25,
        isFree: false,
        workDriveFileId: "r4jl240e91b2f08d04cbda4a6c666e4cb2b85",
      },
      {
        id: "class-26",
        title: "कक्षा 26: TCBT वृक्षायुर्वेद विज्ञान (04-09-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 26 - ऊर्जा चक्र एवं चंद्रकला आधारित रोपण।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 26.mp4"),
        order: 26,
        isFree: false,
        workDriveFileId: "3etzv4794b0937d034ef7a9b20f151336d792",
      },
      {
        id: "class-27",
        title: "कक्षा 27: TCBT वृक्षायुर्वेद विज्ञान (07-09-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 27 - भूमि की उर्वरा शक्ति की त्वरित पुनर्प्राप्ति।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 27.mp4"),
        order: 27,
        isFree: false,
        workDriveFileId: "ahw4f951a7727340d4de6935fa5992f0f3581",
      },
      {
        id: "class-28",
        title: "कक्षा 28: TCBT वृक्षायुर्वेद विज्ञान (08-09-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 28 - जैविक उत्पाद प्रमाणीकरण एवं PGS प्रणाली।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 28.mp4"),
        order: 28,
        isFree: false,
        workDriveFileId: "yzt7cc350daa2bb774a818578d8fc22b2d00e",
      },
      {
        id: "class-29",
        title: "कक्षा 29: TCBT वृक्षायुर्वेद विज्ञान (09-09-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 29 - जैविक उत्पादों की मार्केटिंग एवं ब्रांडिंग।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 29.mp4"),
        order: 29,
        isFree: false,
        workDriveFileId: "jq7tv75d15564f41a40a687e365f988b933ec",
      },
      {
        id: "class-30",
        title: "कक्षा 30: TCBT वृक्षायुर्वेद विज्ञान (10-09-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 30 - लागत घटाने और मुनाफा बढ़ाने के सूत्र।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 30.mp4"),
        order: 30,
        isFree: false,
        workDriveFileId: "gfx5ad4e73d79f63b42a4a9755dcd93dfc279",
      },
      {
        id: "class-31",
        title: "कक्षा 31: TCBT वृक्षायुर्वेद विज्ञान (11-09-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 31 - उन्नत किसान अनुभव एवं केस स्टडीज।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 31.mp4"),
        order: 31,
        isFree: false,
        workDriveFileId: "hp1fa3479d7a0b8614beb99e28d90e2ef34c9",
      },
      {
        id: "class-32",
        title: "कक्षा 32: TCBT वृक्षायुर्वेद विज्ञान (14-09-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 32 - खेत का इकोसिस्टम एवं मित्र कीट संवर्धन।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 32.mp4"),
        order: 32,
        isFree: false,
        workDriveFileId: "wx4fl4d9deffdfa5e4f7eb97772b593c01669",
      },
      {
        id: "class-33",
        title: "कक्षा 33: TCBT वृक्षायुर्वेद विज्ञान (14-09-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 33 - विशेष समस्याएं एवं उनके सटीक प्राकृतिक समाधान।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 33.mp4"),
        order: 33,
        isFree: false,
        workDriveFileId: "wx4fl57079b69547b47da9b3285d8555e0962",
      },
      {
        id: "class-34",
        title: "कक्षा 34: TCBT वृक्षायुर्वेद विज्ञान (16-09-2026)",
        description: "TCBT वृक्षायुर्वेद विज्ञान CLASS 34 - संपूर्ण पाठ्यक्रम का सारांश एवं प्रश्नोत्तरी।",
        duration: 45,
        videoUrl: getCloudflareVideoUrl("videos/CLASS 34.mp4"),
        order: 34,
        isFree: false,
        workDriveFileId: "771js604ada88abe84c2cac31ce6cda1280de",
      },
    ],
  },
];

/** Get a course by its ID */
export function getCourseById(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}

/** Get the default (first) course */
export function getDefaultCourse(): Course {
  return COURSES[0];
}
