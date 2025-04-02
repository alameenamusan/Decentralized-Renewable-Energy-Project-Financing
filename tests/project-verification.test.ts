import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity contract environment
const mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockBlockHeight = 100

// Mock contract state
let admin = mockTxSender
const projects = new Map()
let minTechnicalScore = 70
let minFinancialScore = 70

// Mock contract functions
const registerProject = (projectId, caller = mockTxSender) => {
  if (projects.has(projectId)) {
    return { error: 1 }
  }
  
  projects.set(projectId, {
    owner: caller,
    technicalScore: 0,
    financialScore: 0,
    status: 0,
    timestamp: mockBlockHeight,
  })
  
  return { value: true }
}

const evaluateProject = (projectId, technicalScore, financialScore, caller = mockTxSender) => {
  if (caller !== admin) {
    return { error: 2 }
  }
  
  if (!projects.has(projectId)) {
    return { error: 3 }
  }
  
  const project = projects.get(projectId)
  project.technicalScore = technicalScore
  project.financialScore = financialScore
  projects.set(projectId, project)
  
  return { value: true }
}

const finalizeVerification = (projectId, caller = mockTxSender) => {
  if (caller !== admin) {
    return { error: 2 }
  }
  
  if (!projects.has(projectId)) {
    return { error: 3 }
  }
  
  const project = projects.get(projectId)
  
  if (project.status !== 0) {
    return { error: 4 }
  }
  
  if (project.technicalScore >= minTechnicalScore && project.financialScore >= minFinancialScore) {
    project.status = 1 // Approved
  } else {
    project.status = 2 // Rejected
  }
  
  projects.set(projectId, project)
  
  return { value: true }
}

const isProjectApproved = (projectId) => {
  if (!projects.has(projectId)) {
    return false
  }
  
  const project = projects.get(projectId)
  return project.status === 1
}

const getProject = (projectId) => {
  return projects.get(projectId) || null
}

describe("Project Verification Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    admin = mockTxSender
    projects.clear()
    minTechnicalScore = 70
    minFinancialScore = 70
  })
  
  it("should register a new project", () => {
    const projectId = "project-123"
    const result = registerProject(projectId)
    
    expect(result.value).toBe(true)
    expect(projects.has(projectId)).toBe(true)
    
    const project = projects.get(projectId)
    expect(project.owner).toBe(mockTxSender)
    expect(project.status).toBe(0) // Pending
  })
  
  it("should not register a project with an existing ID", () => {
    const projectId = "project-123"
    registerProject(projectId)
    
    const result = registerProject(projectId)
    expect(result.error).toBe(1)
  })
  
  it("should evaluate a project with scores", () => {
    const projectId = "project-123"
    registerProject(projectId)
    
    const result = evaluateProject(projectId, 80, 75)
    expect(result.value).toBe(true)
    
    const project = projects.get(projectId)
    expect(project.technicalScore).toBe(80)
    expect(project.financialScore).toBe(75)
  })
  
  it("should not allow non-admin to evaluate a project", () => {
    const projectId = "project-123"
    registerProject(projectId)
    
    const result = evaluateProject(projectId, 80, 75, "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")
    expect(result.error).toBe(2)
  })
  
  it("should approve a project that meets minimum scores", () => {
    const projectId = "project-123"
    registerProject(projectId)
    evaluateProject(projectId, 80, 75)
    
    const result = finalizeVerification(projectId)
    expect(result.value).toBe(true)
    
    const project = projects.get(projectId)
    expect(project.status).toBe(1) // Approved
    expect(isProjectApproved(projectId)).toBe(true)
  })
  
  it("should reject a project that does not meet minimum scores", () => {
    const projectId = "project-123"
    registerProject(projectId)
    evaluateProject(projectId, 65, 75)
    
    const result = finalizeVerification(projectId)
    expect(result.value).toBe(true)
    
    const project = projects.get(projectId)
    expect(project.status).toBe(2) // Rejected
    expect(isProjectApproved(projectId)).toBe(false)
  })
})

