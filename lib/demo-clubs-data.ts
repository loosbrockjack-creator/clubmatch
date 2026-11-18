import type { DemoContent } from "./demo-types";
import type { Club } from "./types";

/**
 * Product Management Collective: a made-up club for showing ClubMatch to
 * prospective clients. It doesn't exist at Iowa State. On the live site it's
 * unlisted (see lib/local-demo.ts): reachable by direct link and through its
 * admin panel, but kept out of Explore, search, quiz matches, and This week.
 */
export const DEMO_SLUG = "product-management-collective";

export const demoClub: Club = {
  id: "demo-pmc",
  name: "Product Management Collective",
  mark: "PMC",
  slug: DEMO_SLUG,
  college: "Ivy College of Business",
  tagline: "Learn how products get built by building one, with a team of engineers, designers, and business majors.",
  summary:
    "Product Management Collective is for students curious about how software and physical products go from an idea to something people use. Each semester members join small cross-functional teams that work with an Ames startup or campus partner on a real product problem: talking to users, writing specs, prioritizing a roadmap, and presenting a recommendation. Between projects we run PM case interview practice, product teardowns, and talks with Iowa State alumni working as product managers.",
  academicAreas: ["business", "computing", "design"],
  openToAllMajors: true,
  categories: ["Business", "Computing & Data"],
  careerPaths: ["software", "consulting", "marketing", "entrepreneurship"],
  goalsServed: ["hands-on", "career", "skills"],
  experienceTypes: ["projects", "professional"],
  commitmentLevel: "moderate",
  meetingFrequency: "Weekly, Tuesday evenings",
  meetingDetail:
    "General meetings every Tuesday, 6:00 to 7:00 PM in Gerdin. Project teams meet once more during the week on their own schedule. About 2 to 3 hours a week.",
  bestFor: "Students in business, computing, and design who want to work on real products, though the group is open to any major.",
  whatYouDo: [
    "Join a semester project team working on a real product problem with an Ames startup or campus partner",
    "Practice PM case interviews and product sense questions with upperclassmen who've landed internships",
    "Tear down apps you use every day and figure out why they're built the way they are",
  ],
  whatYouGain: [
    "A product case study you can walk through in an interview",
    "Practice working with engineers and designers on one team",
    "Connections to alumni working in product at tech companies",
  ],
  beginnerFriendly: true,
  freshmenWelcome: true,
  applicationRequired: false,
  stuorgUrl: "",
  memberCount: 38,
  wants: ["projects", "career", "entrepreneurship"],
  topics: ["product management", "user research", "ux", "startups", "case interviews", "tech"],
  audience: "general",
  communityTags: [],
  genderFocus: null,
};

export const demoContent: DemoContent = {
  people: [
    ["Priya Shah", "Management Information Systems", "Senior", ["career:software", "goal:career"], "club"],
    ["Marcus Bell", "Computer Science", "Junior", ["career:software", "goal:hands-on"], "teammates"],
    ["Hannah Weber", "Marketing", "Junior", ["career:marketing", "goal:skills"], "club"],
    ["Tyler Nguyen", "Software Engineering", "Sophomore", ["career:software", "career:entrepreneurship"], "teammates"],
    ["Claire Olson", "Industrial Design", "Senior", ["area:design", "goal:hands-on"], "club"],
    ["Jordan Reyes", "Business Analytics", "Junior", ["career:data-ai", "goal:career"], "club"],
    ["Natalie Kim", "Human Computer Interaction", "Graduate", ["area:design", "career:software"], "club"],
    ["Caleb Jensen", "Management", "Sophomore", ["career:consulting", "goal:skills"], "browsing"],
    ["Aisha Mohammed", "Computer Engineering", "Junior", ["career:software", "goal:hands-on"], "teammates"],
    ["Evan Schmidt", "Entrepreneurship", "Senior", ["career:entrepreneurship", "goal:career"], "club"],
    ["Rachel Park", "Graphic Design", "Sophomore", ["area:design", "career:marketing"], "friends"],
    ["Luis Hernandez", "Industrial Engineering", "Junior", ["career:consulting", "goal:hands-on"], "club"],
    ["Megan Brooks", "Supply Chain Management", "Freshman", ["area:business", "goal:skills"], "browsing"],
    ["Sam Whitaker", "Data Science", "Sophomore", ["career:data-ai", "goal:hands-on"], "study_group"],
    ["Kayla Morris", "Marketing", "Junior", ["career:marketing", "career:software"], "club"],
    ["Andrew Lin", "Computer Science", "Senior", ["career:software", "goal:career"], "teammates"],
    ["Brooke Hanson", "Management Information Systems", "Sophomore", ["career:consulting", "goal:skills"], "club"],
    ["Diego Castillo", "Software Engineering", "Junior", ["career:software", "career:entrepreneurship"], "teammates"],
    ["Emily Carlson", "Business Analytics", "Freshman", ["career:data-ai", "goal:career"], "club"],
    ["Nathan Price", "Mechanical Engineering", "Junior", ["career:engineering-design", "career:entrepreneurship"], "browsing"],
    ["Jasmine Patel", "Interaction Design", "Senior", ["area:design", "career:software"], "club"],
    ["Cole Anderson", "Finance", "Sophomore", ["career:consulting", "career:entrepreneurship"], "club"],
    ["Mia Thompson", "Computer Engineering", "Junior", ["career:software", "goal:skills"], "teammates"],
    ["Ben Koenig", "Management", "Senior", ["career:consulting", "goal:career"], "club"],
  ],
  fit: [
    ["Into Software", "Wants hands-on projects"],
    ["Interested in Business", "Wants to build skills"],
    ["Into Design", "Wants career prep"],
    ["Into Consulting", "Wants hands-on projects"],
  ],
  profile: {
    tagline: "Learn how products get built by building one.",
    description:
      "Product Management Collective is where Iowa State students learn product by doing it. Each semester we form small teams of engineers, designers, and business majors, and each team works with an Ames startup or campus partner on a real product problem, from user interviews to a final roadmap pitch.\n\nNo experience needed. New members join a team in their first two weeks, practice PM case interviews with upperclassmen, and leave the semester with a product case study for their resume. Members have gone on to product internships at tech companies across the Midwest.",
    meeting_info: "Tuesdays, 6:00 to 7:00 PM, Gerdin Business Building. About 2 to 3 hours a week with team work.",
  },
  upcoming: [
    {
      title: "Product Teardown Night",
      description:
        "We pick three apps everyone uses and take them apart: who they're built for, what they chose not to build, and what we'd change. Bring your phone and an opinion. Pizza provided.",
      location: "Gerdin Business Building, Room 1155",
      weekday: 0,
      hour: 18,
      hours: 1.5,
    },
    {
      title: "PM Case Interview Workshop",
      description:
        "Practice product sense and estimation questions in pairs, with feedback from members who've done PM internship interviews. No experience needed.",
      location: "Pearson Hall, Room 1118",
      weekday: 1,
      hour: 18,
      minute: 30,
      hours: 1.5,
    },
    {
      title: "Alumni Panel: Getting Into Product",
      description:
        "Three Iowa State alumni working as product managers talk about how they got their first PM role, what the job really looks like, and which classes helped. Open Q&A after.",
      location: "Student Innovation Center, Room 2220",
      weekday: 3,
      hour: 17,
      minute: 30,
      hours: 1.5,
    },
  ],
  past: [
    {
      title: "Kickoff and Team Matching",
      description: "Meet the club, hear this semester's partner projects, and find a team.",
      location: "Gerdin Business Building, Room 1155",
      daysAgo: 24,
      hourUtc: 23,
      hours: 1.5,
    },
    {
      title: "User Interview Bootcamp",
      description: "How to run user interviews that tell you what to build, and what not to.",
      location: "Pearson Hall, Room 1118",
      daysAgo: 10,
      hourUtc: 23,
      hours: 2,
    },
  ],
  campaigns: [
    {
      subject: "Teardown Night is this week",
      body: "We're tearing down three apps you use every day. Come with opinions, leave with pizza. Everyone is welcome, bring a friend.",
      audience: "both",
      recipient_count: 20,
      daysAgo: 2,
      hourUtc: 18,
    },
    {
      subject: "Project teams: roadmap drafts due Friday",
      body: "Share your draft in your team channel by Friday so your partner has time to read it before the check-in.",
      audience: "members",
      recipient_count: 14,
      daysAgo: 9,
      hourUtc: 16,
    },
    {
      subject: "Thanks for your interest in PMC",
      body: "Our meetings are open to everyone. Come to a Tuesday meeting and see if there's a project team you'd like to join.",
      audience: "interested",
      recipient_count: 6,
      daysAgo: 21,
      hourUtc: 17,
    },
  ],
  majors: [
    ["Management Information Systems", "business"],
    ["Computer Science", "computing"],
    ["Software Engineering", "computing"],
    ["Marketing", "business"],
    ["Business Analytics", "business"],
    ["Industrial Design", "design"],
    ["Computer Engineering", "engineering"],
    ["Management", "business"],
    ["Graphic Design", "design"],
    ["Data Science", "computing"],
  ],
};
